import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/db";
import { User, type Role } from "@/models/User";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        identifier: { label: "Email or Phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const identifier = credentials?.identifier as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!identifier || !password) return null;

        await connectToDatabase();
        const user = await User.findOne({
          active: true,
          $or: [{ email: identifier.toLowerCase() }, { phone: identifier }],
        });
        if (!user) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user._id.toString(),
          name: user.name,
          role: user.role as Role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: Role }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
});

export async function requireRole(allowedRoles: Role[]) {
  const session = await auth();
  if (!session?.user || !allowedRoles.includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session;
}

/**
 * Page-level guard for Server Components: redirects instead of throwing,
 * so an unauthorized role gets sent back to the dashboard rather than
 * seeing a raw error page.
 */
export async function requirePageRole(allowedRoles: Role[]) {
  const session = await auth();
  if (!session?.user || !allowedRoles.includes(session.user.role)) {
    redirect("/dashboard");
  }
  return session;
}
