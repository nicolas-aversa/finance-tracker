"use client";

import { useEffect, useSyncExternalStore } from "react";

const KEY = "hide-amounts";
const EVENT = "hide-amounts-change";

function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false; // private mode / blocked storage — amounts just stay visible
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  // `storage` fires when another tab flips it, so both stay in step.
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * Hides every figure on screen, for reading the app in public.
 *
 * The flag lives on <html> and the blurring is pure CSS (see `.money`), so
 * toggling never re-renders the tree or re-queries anything. It reads through
 * `useSyncExternalStore` rather than an effect-plus-setState, which keeps the
 * server snapshot (`false`) explicit and avoids a hydration mismatch: the
 * server cannot know a per-device preference, so the first paint always shows
 * amounts and the store corrects it on hydration.
 */
export function AmountsToggle() {
  const hidden = useSyncExternalStore(subscribe, read, () => false);

  useEffect(() => {
    document.documentElement.dataset.hideAmounts = hidden ? "1" : "0";
  }, [hidden]);

  function toggle() {
    try {
      window.localStorage.setItem(KEY, hidden ? "0" : "1");
    } catch {
      // nothing to do; the toggle still works for this session
    }
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={hidden}
      aria-label={hidden ? "Mostrar montos" : "Ocultar montos"}
      title={hidden ? "Mostrar montos" : "Ocultar montos"}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-colors hover:border-accent hover:text-accent dark:border-neutral-800 dark:text-neutral-400"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        className="h-4 w-4"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
        <circle cx="12" cy="12" r="3" />
        {hidden && <path d="M4 20 20 4" />}
      </svg>
    </button>
  );
}
