import { NextAuthOptions } from "next-auth";
import { DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from 'bcryptjs';
import { prisma } from "@/lib/db";

// Extend Session type
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string;
      isAdmin?: boolean;
      isProvider?: boolean;
      firstName?: string;
      lastName?: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    email: string;
    role?: string;
    isAdmin: boolean;
    isProvider: boolean;
    firstName?: string;
    lastName?: string;
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
        const timestamp = new Date().toISOString();
        
        if (!credentials?.email || !credentials?.password) {
          console.error('[Auth] Missing credentials:', {
            timestamp,
            hasEmail: !!credentials?.email,
            hasPassword: !!credentials?.password,
          });
          return null;
        }

        try {
          // Attempt to find user
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email
            }
          });

          if (!user) {
            console.error('[Auth] User not found:', {
              timestamp,
              email: credentials.email,
            });
            throw new Error("Invalid email or password");
          }

          // Verify password
          const isPasswordValid = await compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            console.error('[Auth] Invalid password:', {
              timestamp,
              email: credentials.email,
              userId: user.id,
            });
            throw new Error("Invalid email or password");
          }

          // Successful authentication
          console.log('[Auth] Authentication successful:', {
            timestamp,
            userId: user.id,
            email: user.email,
            role: (user as any).role || 'USER',
            isAdmin: user.isAdmin,
            isProvider: user.isProvider || false,
          });

          return {
            id: user.id,
            email: user.email,
            name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email,
            role: (user as any).role || 'USER',
            isAdmin: user.isAdmin,
            isProvider: user.isProvider || false,
            firstName: user.firstName,
            lastName: user.lastName,
          };
        } catch (error: any) {
          // Log database or other errors
          console.error('[Auth] Authorization error:', {
            timestamp,
            error: error.message,
            code: error.code,
            email: credentials.email,
          });
          throw error;
        }
      }
    })
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.isAdmin = user.isAdmin;
        token.isProvider = user.isProvider;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.isAdmin = token.isAdmin as boolean;
        session.user.isProvider = token.isProvider as boolean;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  // Enable debug only in development
  debug: process.env.NODE_ENV === 'development',
  // Custom logger to handle NextAuth warnings and errors
  logger: {
    error(code, metadata) {
      // Log all errors with full context
      console.error('[NextAuth Error]', {
        code,
        metadata,
        timestamp: new Date().toISOString(),
      });
    },
    warn(code) {
      // Suppress known non-critical warnings
      const suppressedWarnings = [
        'INVALID_REQUEST_METHOD', // 405 errors from unsupported HTTP methods
        'SIGNIN_EMAIL_ERROR',     // Email provider errors (not used)
        'CALLBACK_CREDENTIALS_HANDLER_ERROR', // Handled by our error handling
      ];
      
      if (suppressedWarnings.includes(code)) {
        return; // Silently ignore
      }
      
      console.warn('[NextAuth Warning]', {
        code,
        timestamp: new Date().toISOString(),
      });
    },
    debug(code, metadata) {
      // Only log debug info in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[NextAuth Debug]', code, metadata);
      }
    }
  },
  // Critical: Proper cookie configuration for Vercel deployment
  // This fixes login/logout issues on Vercel by ensuring cookies work correctly
  useSecureCookies: process.env.NEXTAUTH_URL?.startsWith('https://'),
  cookies: {
    sessionToken: {
      name: process.env.NEXTAUTH_URL?.startsWith('https://')
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NEXTAUTH_URL?.startsWith('https://'),
        domain: process.env.NEXTAUTH_URL 
          ? new URL(process.env.NEXTAUTH_URL).hostname.replace('www.', '')
          : undefined,
      },
    },
    callbackUrl: {
      name: process.env.NEXTAUTH_URL?.startsWith('https://')
        ? '__Secure-next-auth.callback-url'
        : 'next-auth.callback-url',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NEXTAUTH_URL?.startsWith('https://'),
        domain: process.env.NEXTAUTH_URL 
          ? new URL(process.env.NEXTAUTH_URL).hostname.replace('www.', '')
          : undefined,
      },
    },
    csrfToken: {
      name: process.env.NEXTAUTH_URL?.startsWith('https://')
        ? '__Host-next-auth.csrf-token'
        : 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NEXTAUTH_URL?.startsWith('https://'),
      },
    },
  },
  // Add events for debugging login/logout on Vercel
  events: {
    async signIn({ user, account, profile }) {
      console.log('[Auth Event] Sign in successful:', {
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString(),
      });
    },
    async signOut({ token, session }) {
      console.log('[Auth Event] Sign out:', {
        userId: token?.id || session?.user?.id,
        timestamp: new Date().toISOString(),
      });
    },
    async session({ session, token }) {
      console.log('[Auth Event] Session checked:', {
        userId: session?.user?.id,
        hasToken: !!token,
        timestamp: new Date().toISOString(),
      });
    },
  },
};