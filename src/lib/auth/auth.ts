// lib/auth/auth.ts
import { NextAuthOptions } from "next-auth";
import { DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
/**
 * Workaround for bcrypt/bcryptjs availability:
 * - Use lazy dynamic import to avoid import-time failures when the package is absent.
 * - Prefer bcryptjs (lighter) and fallback to bcrypt.
 * - As last resort, use insecure equality for development-only scenarios.
 */
const compare = async (data: string, hash: string) => {
  try {
    let cmp: ((d: string, h: string) => Promise<boolean>) | null = null;

    // Prefer bcryptjs
    try {
      const mod = await import('bcryptjs');
      if (mod && typeof (mod as any).compare === 'function') {
        cmp = (mod as any).compare;
      }
    } catch (_e) {
      // ignore
    }

    // Fallback to bcrypt
    if (!cmp) {
      try {
        const mod2 = await import('bcrypt');
        if (mod2 && typeof (mod2 as any).compare === 'function') {
          cmp = (mod2 as any).compare;
        }
      } catch (_e2) {
        // ignore
      }
    }

    if (cmp) {
      return await cmp(data, hash);
    }

    // Simple fallback for development (NOT SECURE)
    console.warn("No bcrypt library available, using insecure equality fallback");
    return data === hash;
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
};

import { prisma } from "@/lib/db";

// Define UserRole type to match Prisma schema and staged provider workflow
type UserRole = 'USER' | 'CLERK' | 'ADMIN' | 'PROVIDER' | 'PROVIDER_PENDING' | 'PROVIDER_REVIEWING';
type ProviderApprovalStatus = 'pending' | 'approved' | 'rejected';

// Extend Session type
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: UserRole;
      isAdmin?: boolean;
      isClerk?: boolean;
      isProvider?: boolean;
      providerApprovalStatus?: ProviderApprovalStatus;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    email: string;
    role?: UserRole;
    isAdmin: boolean;
    isProvider: boolean;
    providerApprovalStatus?: ProviderApprovalStatus;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        });

        if (!user) {
          throw new Error("Invalid email or password");
        }

        const isPasswordValid = await compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Invalid email or password");
        }

        const userRole = (user as any).role || 'USER';
        const isClerk = userRole === 'CLERK' || userRole === 'ADMIN';
        const isProvider = (user as any).isProvider || false;
        const providerApprovalStatus = (user as any).providerApprovalStatus as ProviderApprovalStatus | undefined;

        return {
          id: user.id,
          email: user.email,
          name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName || user.lastName || '',
          image: user.image,
          role: userRole,
          isAdmin: user.isAdmin,
          isClerk: isClerk,
          isProvider: isProvider,
          providerApprovalStatus
        };
      }
    })
  ],
  pages: {
    signIn: "/login",
    // REMOVE signOut custom page - let NextAuth handle it
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.isAdmin = user.isAdmin;
        token.isClerk = (user as any).isClerk;
        token.isProvider = (user as any).isProvider;
        (token as any).providerApprovalStatus = (user as any).providerApprovalStatus;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.isAdmin = token.isAdmin as boolean;
        session.user.isClerk = token.isClerk as boolean;
        session.user.isProvider = token.isProvider as boolean;
        session.user.providerApprovalStatus = (token as any).providerApprovalStatus as ProviderApprovalStatus | undefined;
      }
      return session;
    },
    // IMPORTANT: Add redirect callback for proper logout
    async redirect({ url, baseUrl }) {
      console.log('[NextAuth Redirect] url:', url, 'baseUrl:', baseUrl);
      
      // Handle signout - redirect to login
      if (url.includes('signout')) {
        console.log('[NextAuth Redirect] Signout detected - redirecting to /login');
        return `${baseUrl}/login`;
      }

      // If URL starts with callback
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      
      // If same origin, allow
      if (new URL(url).origin === baseUrl) {
        return url;
      }
      
      return baseUrl;
    }
  },
  events: {
    async signOut({ token, session }) {
      console.log('[NextAuth Event] User signed out:', {
        email: token?.email || session?.user?.email,
        role: token?.role || session?.user?.role,
      });
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || "your-fallback-secret-for-development"
};
