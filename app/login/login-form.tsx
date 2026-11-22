"use client";

import { useSearchParams } from "next/navigation";
import { useActionState, useId } from "react";
import { signIn, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const next = useSearchParams().get("next") ?? "/admin";
  const [state, formAction, pending] = useActionState(signIn, initialState);
  // Unique per instance: Next keeps recently visited pages mounted (hidden),
  // so a fixed id could point a label at the hidden copy of this form.
  const uid = useId();

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor={`${uid}-email`} className="label">
          Email
        </label>
        <input
          id={`${uid}-email`}
          name="email"
          type="email"
          className="input"
          required
          autoComplete="username"
          defaultValue={state.email}
        />
      </div>
      <div>
        <label htmlFor={`${uid}-password`} className="label">
          Password
        </label>
        <input
          id={`${uid}-password`}
          name="password"
          type="password"
          className="input"
          required
          autoComplete="current-password"
        />
      </div>
      {state.error ? (
        <p className="text-sm font-medium text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
