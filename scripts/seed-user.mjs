// Creates the users table if needed and adds (or resets) one leader account.
// Usage: npm run seed:user
// Reads POSTGRES_URL, ADMIN_EMAIL, ADMIN_PASSWORD and optional ADMIN_NAME from .env.local.
import { existsSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const { POSTGRES_URL, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME = "Bishopric" } = process.env;
if (!POSTGRES_URL || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("Set POSTGRES_URL, ADMIN_EMAIL and ADMIN_PASSWORD in .env.local first.");
  process.exit(1);
}
if (ADMIN_PASSWORD.length < 8) {
  console.error("ADMIN_PASSWORD must be at least 8 characters.");
  process.exit(1);
}

const sql = neon(POSTGRES_URL);
await sql`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
  )`;

const email = ADMIN_EMAIL.trim().toLowerCase();
const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
await sql`
  INSERT INTO users (name, email, password_hash)
  VALUES (${ADMIN_NAME}, ${email}, ${passwordHash})
  ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash`;

console.log(`Leader account ready: ${email}`);