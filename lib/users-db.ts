import { sql } from "./db";

export interface LeaderUser {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
}

interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
}

// Emails are stored lower-case by scripts/seed-user.mjs, so the lookup matches any casing.
export async function getUserByEmail(email: string): Promise<LeaderUser | null> {
  const rows = await sql()`
    SELECT id, name, email, password_hash
    FROM users
    WHERE email = ${email.trim().toLowerCase()}`;
  const [row] = rows as UserRow[];
  return row ? { id: row.id, name: row.name, email: row.email, passwordHash: row.password_hash } : null;
}