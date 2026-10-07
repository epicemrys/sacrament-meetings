import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { getUserByEmail } from "./lib/users-db";

const CredentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = CredentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await getUserByEmail(email);
        if (!user) return null;

        const passwordsMatch = await bcrypt.compare(password, user.passwordHash);
        return passwordsMatch ? { id: String(user.id), name: user.name, email: user.email } : null;
      },
    }),
  ],
});