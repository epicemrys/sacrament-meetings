"use client";

import { useActionState, type ReactElement } from "react";
import { authenticate } from "@/lib/auth-actions";

export default function LoginForm({ redirectTo }: { redirectTo: string }): ReactElement {
  const [state, formAction, isPending] = useActionState(authenticate, undefined);
  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-semibold">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" defaultValue={state?.email} required className="field-control" />
      </div>
      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-semibold">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" minLength={8} required className="field-control" />
      </div>
      {state?.message && <p role="alert" className="field-error">{state.message}</p>}
      <button type="submit" disabled={isPending} className="button-primary w-full disabled:opacity-70">
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}