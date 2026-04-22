import { Link, useLocation } from "wouter";
import { ArrowDownUp, Droplets, BarChart2 } from "lucide-react";

const tabs = [
  { path: "/", label: "Swap", Icon: ArrowDownUp },
  { path: "/pool", label: "Pool", Icon: Droplets },
  { path: "/dashboard", label: "Dashboard", Icon: BarChart2 },
];

export function MobileNav() {
  const [location] = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur border-t border-border/50 pb-safe">
      <div className="grid grid-cols-3">
        {tabs.map(({ path, label, Icon }) => {
          const active = location === path || (path !== "/" && location.startsWith(path));
          return (
            <Link key={path} href={path}>
              <button
                className={`flex flex-col items-center justify-center gap-1 w-full py-3 transition-colors ${
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform ${active ? "scale-110" : ""}`} />
                <span className="text-[10px] font-medium tracking-wide">{label}</span>
                {active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
