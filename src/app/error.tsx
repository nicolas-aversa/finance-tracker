"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-neutral-50 px-4 text-center dark:bg-neutral-950">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-3xl dark:bg-red-950">
        ⚠️
      </div>
      <div>
        <p className="font-medium text-neutral-900 dark:text-neutral-100">Algo falló</p>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Puede haber sido un problema momentáneo de conexión.
        </p>
      </div>
      <button onClick={reset} className="btn-accent px-6">
        Reintentar
      </button>
    </div>
  );
}
