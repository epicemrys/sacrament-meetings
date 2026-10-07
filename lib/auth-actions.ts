"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

export interface LoginState {
  message: string;
  // React resets the form after the action, so the typed email comes back to refill it.
  email: string;
}

export async function authenticate(prevState: LoginState | undefined, formData: FormData): Promise<LoginState | undefined> {
  try {
    // signIn reads email, password and redirectTo from the form, then redirects on success.
    await signIn("credentials", formData);
  } catch (error) {
    if (error instanceof AuthError) {
      const email = formData.get("email");
      return {
        message: error.type === "CredentialsSignin"
          ? "The email or password is not correct."
          : "Something went wrong. Please try again.",
        email: typeof email === "string" ? email : "",
      };
    }
    // The success redirect is thrown as an error too, so let it through.
    throw error;
  }
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}