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

  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: { httpOnly: true, sameSite: "none", path: "/", secure: true },
    },
    callbackUrl: {
      name: process.env.NODE_ENV === "production" ? "__Secure-next-auth.callback-url" : "next-auth.callback-url",
      options: { sameSite: "none", path: "/", secure: true },
    },
    csrfToken: {
      name: process.env.NODE_ENV === "production" ? "__Host-next-auth.csrf-token" : "next-auth.csrf-token",
      options: { httpOnly: true, sameSite: "none", path: "/", secure: true },
    },
    pkceCodeVerifier: {
      name: process.env.NODE_ENV === "production" ? "__Secure-next-auth.pkce.code_verifier" : "next-auth.pkce.code_verifier",
      options: { httpOnly: true, sameSite: "none", path: "/", secure: true },
    },
    state: {
      name: process.env.NODE_ENV === "production" ? "__Secure-next-auth.state" : "next-auth.state",
      options: { httpOnly: true, sameSite: "none", path: "/", secure: true },
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
