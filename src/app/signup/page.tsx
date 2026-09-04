"use client";

import { useActionState } from "react";
import { AuthCard } from "@/components/AuthCard";
import { signup } from "./actions";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, undefined);

  return (
    <AuthCard
      title="Crear cuenta"
      subtitle="Necesitás el código de invitación para registrarte."
      footer={{ text: "¿Ya tenés cuenta?", href: "/login", label: "Entrar" }}
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
          <input name="password" type="password" autoComplete="new-password" className="input" />
          <span className="text-[11px] text-neutral-400 dark:text-neutral-500">Mínimo 8 caracteres.</span>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Código de invitación</span>
          <input name="invite" type="text" autoComplete="off" spellCheck={false} className="input" />
        </label>

        {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

        <button type="submit" disabled={pending} className="btn-accent mt-1 w-full">
          {pending ? "Creando..." : "Crear cuenta"}
        </button>
      </form>
    </AuthCard>
  );
}
