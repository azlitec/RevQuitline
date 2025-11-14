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
};