"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const BASE_LINK_CLASS = "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs transition-colors";
const INACTIVE_CLASS = "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100";
const ACTIVE_CLASS = "text-accent";

const INVESTMENT_TABS = [
  { href: "/", label: "Dashboard", icon: "📊", exact: true },
  { href: "/add", label: "Cargar", icon: "➕" },
  { href: "/log", label: "Historial", icon: "📜" },
];

const EXPENSE_TABS = [
  { href: "/gastos", label: "Resumen", icon: "📊", exact: true },
  { href: "/gastos/subir", label: "Subir", icon: "⬆️" },
  { href: "/gastos/movimientos", label: "Movimientos", icon: "📜" },
];

export function BottomNav() {
  const pathname = usePathname();
  const tabs = pathname.startsWith("/gastos") ? EXPENSE_TABS : INVESTMENT_TABS;

  return (
    <nav
      className="sticky bottom-0 z-10 flex border-t border-neutral-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      {tabs.map((tab) => {
        const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link key={tab.href} href={tab.href} className={`${BASE_LINK_CLASS} ${isActive ? ACTIVE_CLASS : INACTIVE_CLASS}`}>
            <span className="text-lg">{tab.icon}</span>
            {tab.label}
          </Link>
        );
      })}
      <form action="/api/auth/logout" method="POST" className="flex flex-1">
        <button type="submit" className={`${BASE_LINK_CLASS} ${INACTIVE_CLASS} w-full`}>
          <span className="text-lg">🚪</span>
          Salir
        </button>
      </form>
    </nav>
  );
}
