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
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          });

          if (!user) {
            return null;
          }

          const isPasswordValid = await compare(credentials.password, user.password);

          if (!isPasswordValid) {
            return null;
          }

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
        } catch (error) {
          console.error('Auth error:', error);
          return null;
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
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};