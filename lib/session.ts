import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Checked where the data is used, as well as in proxy.ts: server actions are public
// POST endpoints, and a page can be reached by a path variant the proxy didn't catch.
export async function requireLeader(returnTo = "/meetings"): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=${encodeURIComponent(returnTo)}`);
}