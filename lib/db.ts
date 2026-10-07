import { neon } from "@neondatabase/serverless";

let client: ReturnType<typeof neon> | null = null;

// One lazily created Neon client shared by every query module.
export function sql(): ReturnType<typeof neon> {
  if (!client) {
    const url = process.env.POSTGRES_URL;
    if (!url) throw new Error("POSTGRES_URL is not set.");
    client = neon(url);
  }
  return client;
}