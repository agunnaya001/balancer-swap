import { Navbar } from "./Navbar";
import { NetworkBanner } from "./NetworkBanner";
import { MobileNav } from "./MobileNav";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans">
      <Navbar />
      <NetworkBanner />
      <main className="flex-1 flex flex-col pt-4 pb-24 md:pb-8">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
