import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  // @ts-ignore — PrismaAdapter type mismatch between next-auth versions is fine
  adapter: PrismaAdapter(prisma),

  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          // Request offline access so we get a refresh_token
          access_type: "offline",
          prompt:      "consent",
          // Scopes: profile + email + Google Calendar read/write
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/calendar",
          ].join(" "),
        },
      },
    }),
  ],

  session: {
    strategy: "database",
  },

  callbacks: {
    // Expose userId in the client-side session
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },

  pages: {
    signIn:  "/login",
    error:   "/login",
  },
};

// Augment next-auth types so session.user.id is available
declare module "next-auth" {
  interface Session {
    user: {
      id:    string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
