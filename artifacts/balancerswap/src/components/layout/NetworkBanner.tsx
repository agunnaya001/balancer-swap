import { useWallet } from "@/hooks/use-wallet";
import { useNetwork } from "@/hooks/use-network";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export function NetworkBanner() {
  const { address } = useWallet();
  const { isCorrectNetwork, switchToSepolia } = useNetwork();

  if (!address || isCorrectNetwork) return null;

  return (
    <div className="bg-destructive/10 border-b border-destructive/30 px-4 py-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm text-destructive">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>Wrong network — BalancerSwap runs on Sepolia testnet</span>
      </div>
      <Button
        size="sm"
        variant="destructive"
        className="shrink-0 h-7 text-xs"
        onClick={switchToSepolia}
      >
        Switch to Sepolia
      </Button>
    </div>
  );
}
