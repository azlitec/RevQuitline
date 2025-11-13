import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { validateBody } from '@/lib/api/validate';
import { errorResponse, jsonEntity } from '@/lib/api/response';
import { auditUpdate } from '@/lib/audit/audit';

interface Params {
  params: Promise<{
    id: string;
  }>;
}

// PATCH - Update user role
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    
    // Check user authentication and admin permissions
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return errorResponse('Unauthorized', 401);
    }
    
    // Ensure user is an admin
    if (!session.user.isAdmin) {
      return errorResponse('Forbidden', 403);
    }
    
    // Prevent admin from modifying their own admin role to avoid lockout
    if (id === session.user.id) {
      return errorResponse('Cannot modify your own admin status', 403);
    }
    
    // Get the user
    const user = await prisma.user.findUnique({
      where: { id }
    });
    
    if (!user) {
      return errorResponse('User not found', 404);
    }
    
    // Validate request body with Zod
    const RolePatchSchema = z.object({
      role: z.enum(['isAdmin','isClerk','isProvider']),
      value: z.boolean(),
      confirmPassword: z.string().min(8).optional(),
    });
    const parsed = await validateBody(request, RolePatchSchema);
    if ('error' in parsed) return parsed.error;
    const { role, value, confirmPassword } = parsed.data;
    
    // Role validity enforced by Zod schema above
    if (role === 'isAdmin' && value === true && !confirmPassword) {
      // Additional auth safeguard: require password confirmation when granting admin
      return errorResponse('Confirm password required to grant admin privileges', 400);
    }
    
    // Update user role
    const updateData: any = {
      [role]: value
    };
    
    // If making user an admin/clerk, update the role field too
    if (value) {
      const roleMapping: Record<string, string> = {
        'isAdmin': 'ADMIN',
        'isClerk': 'CLERK',
        'isProvider': 'PROVIDER'
      };
      
      updateData.role = roleMapping[role];
    } else {
      // If removing a role, check if any other special roles remain
      const hasOtherRoles = (role !== 'isAdmin' && user.isAdmin) ||
                            (role !== 'isClerk' && user.isClerk) ||
                            (role !== 'isProvider' && user.isProvider);
      
      // If no other special roles, set role back to USER
      if (!hasOtherRoles) {
        updateData.role = 'USER';
      }
    }
    
    // Update the user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData
    });
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = updatedUser;
    
    // Audit role change (non-blocking, minimal metadata)
    try {
      await auditUpdate(request, session, 'user', id, {
        changedRoleFlag: role,
        newValue: value,
        previousValue: (user as any)[role],
        updatedRole: updateData.role ?? null,
      });
    } catch (auditErr) {
      console.error('Audit role change failed', { message: (auditErr as any)?.message });
    }
    
    return jsonEntity(request, {
      message: 'User role updated successfully',
      user: userWithoutPassword
    }, 200);
  } catch (error) {
    console.error('Error updating user role:', { message: (error as any)?.message });
    return errorResponse('An error occurred while updating user role', 500);
  }
}