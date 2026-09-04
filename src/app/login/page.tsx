"use client";

import { useActionState } from "react";
import { AuthCard } from "@/components/AuthCard";
import { login } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <AuthCard
      title="Finance Tracker"
      subtitle="Entrá con tu email y contraseña."
      footer={{ text: "¿No tenés cuenta?", href: "/signup", label: "Crear una" }}
    >
      <form action={formAction} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Email</span>
          <input
            name="email"
            type="email"
            autoFocus
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="vos@ejemplo.com"
            className="input"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Contraseña</span>
          <input name="password" type="password" autoComplete="current-password" className="input" />
        </label>

        {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

        <button type="submit" disabled={pending} className="btn-accent mt-1 w-full">
          {pending ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </AuthCard>
  );
}
