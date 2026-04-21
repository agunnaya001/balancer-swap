import { Link, useLocation } from "wouter";
import { useWallet } from "@/hooks/use-wallet";
import { Button } from "@/components/ui/button";

const Logo = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary mr-2">
    <path d="M16 2L2 16L16 30L30 16L16 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 2L8 16L16 30L24 16L16 2Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export function Navbar() {
  const [location] = useLocation();
  const { address, balance, connect, disconnect, isConnecting } = useWallet();

  return (
    <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
            <Logo />
            <span className="font-bold text-xl tracking-tight text-foreground">Balancer<span className="text-primary">Swap</span></span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/">
              <div className={`px-4 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent/10 ${location === "/" ? "bg-accent/20 text-primary" : "text-muted-foreground"}`}>
                Swap
              </div>
            </Link>
            <Link href="/pool">
              <div className={`px-4 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent/10 ${location === "/pool" ? "bg-accent/20 text-primary" : "text-muted-foreground"}`}>
                Pool
              </div>
            </Link>
            <Link href="/dashboard">
              <div className={`px-4 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent/10 ${location === "/dashboard" ? "bg-accent/20 text-primary" : "text-muted-foreground"}`}>
                Dashboard
              </div>
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {address ? (
            <div className="flex items-center bg-secondary/50 border border-border rounded-lg overflow-hidden">
              <div className="px-3 py-1.5 text-sm font-mono text-muted-foreground border-r border-border">
                {Number(balance).toFixed(4)} ETH
              </div>
              <button 
                onClick={disconnect}
                className="px-3 py-1.5 text-sm font-mono hover:bg-destructive/20 hover:text-destructive transition-colors"
              >
                {address.slice(0, 6)}...{address.slice(-4)}
              </button>
            </div>
          ) : (
            <Button 
              onClick={connect} 
              disabled={isConnecting}
              className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
            >
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
