import Link from "next/link";

/** Shared chrome for the login and signup screens, so the two look like one app. */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: { text: string; href: string; label: string };
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-accent-soft to-neutral-50 px-4 py-10 dark:from-accent-soft dark:to-neutral-950">
      <div className="w-full max-w-sm rounded-3xl border border-neutral-200 bg-white p-7 shadow-lg shadow-neutral-900/5 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-xl font-semibold text-accent-foreground shadow-sm shadow-accent/30">
          $
        </div>

        <h1 className="mb-1 text-xl font-semibold text-neutral-900 dark:text-neutral-100">{title}</h1>
        <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</p>

        {children}

        <p className="mt-5 text-center text-sm text-neutral-500 dark:text-neutral-400">
          {footer.text}{" "}
          <Link href={footer.href} className="font-medium text-accent hover:text-accent-hover">
            {footer.label}
          </Link>
        </p>
      </div>
    </div>
  );
}
