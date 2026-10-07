import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Signed-out visitors to a leader page
// are sent to /login; signed-in leaders who open /login go to the meetings list.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/meetings/new", "/meetings/:id/edit", "/login"],
};