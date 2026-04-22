import { Link, useLocation } from "wouter";
import { useWallet } from "@/hooks/use-wallet";
import { useNetwork } from "@/hooks/use-network";
import { Button } from "@/components/ui/button";

const Logo = () => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary mr-2 shrink-0">
    <path d="M16 2L2 16L16 30L30 16L16 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 2L8 16L16 30L24 16L16 2Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export function Navbar() {
  const [location] = useLocation();
  const { address, balance, connect, disconnect, isConnecting } = useWallet();
  const { isCorrectNetwork } = useNetwork();

  return (
    <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">

        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
            <Logo />
            <span className="font-bold text-lg md:text-xl tracking-tight">Balancer<span className="text-primary">Swap</span></span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {[{ href: "/", label: "Swap" }, { href: "/pool", label: "Pool" }, { href: "/dashboard", label: "Dashboard" }].map(({ href, label }) => (
              <Link key={href} href={href}>
                <div className={`px-4 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent/10 ${
                  location === href ? "bg-accent/20 text-primary" : "text-muted-foreground"
                }`}>
                  {label}
                </div>
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {address && (
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${isCorrectNetwork ? "bg-green-400" : "bg-destructive animate-pulse"}`} />
              <span className="text-xs text-muted-foreground hidden sm:block">
                {isCorrectNetwork ? "Sepolia" : "Wrong Network"}
              </span>
            </div>
          )}

          {address ? (
            <div className="flex items-center bg-secondary/50 border border-border rounded-lg overflow-hidden">
              <div className="px-2 md:px-3 py-1.5 text-xs md:text-sm font-mono text-muted-foreground border-r border-border hidden sm:block">
                {Number(balance).toFixed(4)} ETH
              </div>
              <button
                onClick={disconnect}
                className="px-2 md:px-3 py-1.5 text-xs md:text-sm font-mono hover:bg-destructive/20 hover:text-destructive transition-colors"
              >
                {address.slice(0, 6)}…{address.slice(-4)}
              </button>
            </div>
          ) : (
            <Button
              onClick={connect}
              disabled={isConnecting}
              className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 text-sm"
            >
              {isConnecting ? "Connecting…" : "Connect Wallet"}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
