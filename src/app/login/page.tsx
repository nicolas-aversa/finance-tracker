"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-accent-soft to-neutral-50 px-4 dark:from-accent-soft dark:to-neutral-950">
      <form
        action={formAction}
        className="w-full max-w-sm rounded-3xl border border-neutral-200 bg-white p-7 shadow-lg shadow-neutral-900/5 dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-xl font-semibold text-accent-foreground shadow-sm shadow-accent/30">
          $
        </div>

        <h1 className="mb-1 text-xl font-semibold text-neutral-900 dark:text-neutral-100">CEDEAR Tracker</h1>
        <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">Ingresá el passcode para continuar.</p>

        <label htmlFor="passcode" className="sr-only">
          Passcode
        </label>
        <input
          id="passcode"
          name="passcode"
          type="password"
          inputMode="text"
          autoFocus
          autoComplete="current-password"
          placeholder="Passcode"
          className="input"
        />

        {state?.error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{state.error}</p>}

        <button type="submit" disabled={pending} className="btn-accent mt-4 w-full">
          {pending ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
