export type NavIconName = "dashboard" | "add" | "log" | "upload" | "list" | "logout";

const PATHS: Record<NavIconName, React.ReactNode> = {
  dashboard: (
    <>
      <path d="M4 19V11" />
      <path d="M10 19V5" />
      <path d="M16 19v-6" />
      <path d="M2.5 19h19" />
    </>
  ),
  add: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  log: (
    <>
      <path d="M5 4h11l3 3v13H5z" />
      <path d="M8.5 10h7" />
      <path d="M8.5 14h4.5" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V5" />
      <path d="M8 9l4-4 4 4" />
      <path d="M5 18.5h14" />
    </>
  ),
  list: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h10" />
    </>
  ),
  logout: (
    <>
      <path d="M14 5H6v14h8" />
      <path d="M12 12h8" />
      <path d="M17 9l3 3-3 3" />
    </>
  ),
};

/**
 * Monochrome line icons for the tab bar. They inherit `currentColor`, so the
 * active tab is the only thing carrying colour — emoji glyphs each brought
 * their own palette and made the bar read as a jumble.
 */
export function NavIcon({ name }: { name: NavIconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[name]}
    </svg>
  );
}
