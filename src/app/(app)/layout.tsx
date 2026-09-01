import { BottomNav } from "@/components/BottomNav";
import { SectionSwitcher } from "@/components/SectionSwitcher";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-4 pt-6">
        <SectionSwitcher />
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
