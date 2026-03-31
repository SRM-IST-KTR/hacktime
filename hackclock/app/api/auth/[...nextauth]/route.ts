import NextAuth from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { NextAuthOptions, Session } from "next-auth";
import { JWT } from "next-auth/jwt";

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
    }),
    CredentialsProvider({
      name: "Terminal Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
            method: 'POST',
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
            headers: { "Content-Type": "application/json" }
          });

          const user = await res.json();

          if (res.ok && user) {
            return {
              id: user.id,
              name: user.name, 
              email: user.email,
              image: user.profilePic,
              activeRoomId: user.activeRoomId // Catching the room ID from the backend!
            };
          }
          
          return null;
        } catch (error) {
          console.error("Auth fetch error:", error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      const authToken = token as JWT & { activeRoomId?: string };

      if (user) {
        const authUser = user as typeof user & { activeRoomId?: string };
        authToken.id = user.id;
        authToken.name = user.name;
        authToken.picture = user.image; 
        authToken.activeRoomId = authUser.activeRoomId;
      }
      
      if (trigger === "update" && session) {
        const updatedSession = session as Session & {
          name?: string;
          image?: string;
          activeRoomId?: string | null;
        };
        const updatedUser = updatedSession.user as (Session["user"] & {
          activeRoomId?: string | null;
        }) | undefined;

        const nextName = updatedUser?.name ?? updatedSession.name;
        const nextImage = updatedUser?.image ?? updatedSession.image;
        const hasRootActiveRoom = Object.prototype.hasOwnProperty.call(updatedSession, "activeRoomId");
        const nextActiveRoomId = updatedUser?.activeRoomId ?? (hasRootActiveRoom ? updatedSession.activeRoomId : undefined);

        if (nextName) authToken.name = nextName;
        if (nextImage) authToken.picture = nextImage;
        if (nextActiveRoomId !== undefined) authToken.activeRoomId = nextActiveRoomId ?? undefined;
      }
      
      return authToken;
    },
    async session({ session, token }: { session: Session; token: JWT & { activeRoomId?: string } }) {
      if (session.user) {
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
        (session.user as Session["user"] & { activeRoomId?: string }).activeRoomId = token.activeRoomId;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      if (url.startsWith(baseUrl)) {
        return url;
      }

      return `${baseUrl}/dashboard`;
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
