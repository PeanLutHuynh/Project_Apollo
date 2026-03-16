import { NextAuthOptions } from "next-auth";
import { Prisma } from "@prisma/client";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    ...(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const normalizedEmail = credentials.email.trim().toLowerCase();

        const user = await db.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (!user) return null;

        // Password login is disabled for Google-only accounts.
        if (!user.password) return null;

        if (user.lockoutUntil && user.lockoutUntil.getTime() > Date.now()) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          const nextFailedAttempts = user.failedLoginAttempts + 1;
          const shouldLock = nextFailedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS;

          await db.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: shouldLock ? 0 : nextFailedAttempts,
              lockoutUntil: shouldLock
                ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
                : null,
            },
          });

          return null;
        }

        if (user.failedLoginAttempts > 0 || user.lockoutUntil) {
          await db.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: 0,
              lockoutUntil: null,
            },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") {
        return true;
      }

      const email = user.email?.trim().toLowerCase();
      if (!email) {
        return false;
      }

      const existingUser = await db.user.findUnique({
        where: { email },
      });

      if (existingUser && existingUser.password !== null) {
        return "/login?error=EmailExistsWithPassword";
      }

      if (!existingUser) {
        try {
          await db.user.create({
            data: {
              email,
              name: user.name?.trim() || null,
              password: null,
            },
          });
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError) {
            // Race condition: user created in another request between findUnique and create.
            if (error.code === "P2002") {
              return true;
            }

            // Common when database schema hasn't been updated yet (password still NOT NULL).
            if (error.code === "P2011") {
              return "/login?error=GoogleSignupUnavailable";
            }
          }

          return "/login?error=GoogleSignupUnavailable";
        }
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }

      if (token.email && (!token.id || !token.role || user)) {
        const dbUser = await db.user.findUnique({
          where: { email: token.email },
          select: { id: true, role: true },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};
