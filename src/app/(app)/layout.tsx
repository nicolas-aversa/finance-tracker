import { AmountsToggle } from "@/components/AmountsToggle";
import { BottomNav } from "@/components/BottomNav";
import { SectionSwitcher } from "@/components/SectionSwitcher";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-4 pt-6">
        {/* One toggle beside the section switcher covers both sections. */}
        <div className="mb-4 flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <SectionSwitcher />
          </div>
          <AmountsToggle />
        </div>
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
