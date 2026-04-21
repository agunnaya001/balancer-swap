import { useState, useEffect } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { useDex } from "@/hooks/use-dex";
import { useGetDexConfig, useGetPoolStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, ArrowDownUp } from "lucide-react";
import { ethers } from "ethers";
import { Skeleton } from "@/components/ui/skeleton";

export default function Swap() {
  const { address } = useWallet();
  const { data: config } = useGetDexConfig();
  const { data: poolStats } = useGetPoolStats();
  const { swapEthForTokens, swapTokensForEth, getQuote, isPending } = useDex();

  const [isEthIn, setIsEthIn] = useState(true);
  const [amountIn, setAmountIn] = useState("");
  const [amountOut, setAmountOut] = useState("");
  const [slippage, setSlippage] = useState(0.5);
  const [isQuoting, setIsQuoting] = useState(false);

  useEffect(() => {
    const fetchQuote = async () => {
      if (!amountIn || isNaN(Number(amountIn)) || Number(amountIn) <= 0) {
        setAmountOut("");
        return;
      }
      setIsQuoting(true);
      const quote = await getQuote(amountIn, isEthIn);
      setAmountOut(quote);
      setIsQuoting(false);
    };

    const timer = setTimeout(fetchQuote, 500);
    return () => clearTimeout(timer);
  }, [amountIn, isEthIn, getQuote]);

  const handleSwap = async () => {
    if (!amountIn || !amountOut) return;
    const outWithSlippage = Number(amountOut) * (1 - slippage / 100);
    const minOutStr = outWithSlippage.toFixed(18);

    if (isEthIn) {
      await swapEthForTokens(amountIn, minOutStr);
    } else {
      await swapTokensForEth(amountIn, minOutStr);
    }
    setAmountIn("");
  };

  const toggleDirection = () => {
    setIsEthIn(!isEthIn);
    setAmountIn(amountOut);
    setAmountOut("");
  };

  const calculatePriceImpact = () => {
    if (!poolStats || !amountIn) return 0;
    try {
      const inWei = ethers.parseEther(amountIn);
      let reserveWei;
      if (isEthIn) {
        reserveWei = BigInt(poolStats.ethReserve);
      } else {
        reserveWei = BigInt(poolStats.tokenReserve);
      }
      if (reserveWei === 0n) return 0;
      return (Number(inWei) / Number(reserveWei)) * 100;
    } catch {
      return 0;
    }
  };

  const priceImpact = calculatePriceImpact();

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-[480px]">
        <Card className="border-border/50 bg-card shadow-2xl relative overflow-hidden">
          {/* Subtle glow effect */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-primary/10 blur-[100px] pointer-events-none rounded-full" />
          
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-xl font-medium">Swap</CardTitle>
            <div className="flex items-center gap-2">
              <select 
                className="bg-secondary/50 text-xs border-none rounded p-1 text-muted-foreground outline-none"
                value={slippage}
                onChange={(e) => setSlippage(Number(e.target.value))}
              >
                <option value={0.5}>0.5% slippage</option>
                <option value={1}>1.0% slippage</option>
                <option value={2}>2.0% slippage</option>
              </select>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-2">
            {/* Input Box */}
            <div className="bg-secondary/30 rounded-xl p-4 border border-border/50 hover:border-primary/30 transition-colors group">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">You pay</span>
                <span className="text-xs text-muted-foreground">Balance: --</span>
              </div>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  placeholder="0.0"
                  value={amountIn}
                  onChange={(e) => setAmountIn(e.target.value)}
                  className="border-0 bg-transparent text-3xl p-0 h-auto font-mono placeholder:text-muted-foreground/30 focus-visible:ring-0 shadow-none"
                />
                <div className="bg-secondary px-3 py-1.5 rounded-lg flex items-center gap-2 font-medium shrink-0">
                  {isEthIn ? "ETH" : config?.tokenSymbol || "BAL"}
                </div>
              </div>
            </div>

            {/* Swap Direction Toggle */}
            <div className="flex justify-center -my-3 relative z-10">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-10 w-10 rounded-xl bg-card border-border/50 text-muted-foreground hover:text-primary hover:border-primary/50 shadow-sm"
                onClick={toggleDirection}
              >
                <ArrowDownUp className="w-4 h-4" />
              </Button>
            </div>

            {/* Output Box */}
            <div className="bg-secondary/30 rounded-xl p-4 border border-border/50">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">You receive</span>
                <span className="text-xs text-muted-foreground">Balance: --</span>
              </div>
              <div className="flex items-center gap-4">
                {isQuoting ? (
                  <Skeleton className="h-9 w-32 bg-secondary" />
                ) : (
                  <Input
                    type="text"
                    readOnly
                    value={amountOut ? Number(amountOut).toFixed(6) : "0.0"}
                    className="border-0 bg-transparent text-3xl p-0 h-auto font-mono text-muted-foreground focus-visible:ring-0 shadow-none pointer-events-none"
                  />
                )}
                <div className="bg-secondary px-3 py-1.5 rounded-lg flex items-center gap-2 font-medium shrink-0">
                  {!isEthIn ? "ETH" : config?.tokenSymbol || "BAL"}
                </div>
              </div>
            </div>

            {/* Details */}
            {amountOut && Number(amountOut) > 0 && (
              <div className="py-2 px-1 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Rate</span>
                  <span className="font-mono text-foreground">
                    1 {isEthIn ? "ETH" : config?.tokenSymbol || "BAL"} = {(Number(amountOut)/Number(amountIn)).toFixed(6)} {!isEthIn ? "ETH" : config?.tokenSymbol || "BAL"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Price Impact</span>
                  <span className={`font-mono ${priceImpact > 5 ? 'text-destructive' : priceImpact > 2 ? 'text-yellow-500' : 'text-success'}`}>
                    {priceImpact < 0.01 ? '<0.01' : priceImpact.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Minimum Received</span>
                  <span className="font-mono text-foreground">
                    {(Number(amountOut) * (1 - slippage/100)).toFixed(6)} {!isEthIn ? "ETH" : config?.tokenSymbol || "BAL"}
                  </span>
                </div>
              </div>
            )}

            {/* Action Button */}
            <Button 
              className="w-full mt-2 h-14 text-lg font-medium shadow-lg shadow-primary/20" 
              size="lg"
              disabled={!address || !amountIn || !amountOut || isPending}
              onClick={handleSwap}
            >
              {!address ? "Connect Wallet to Swap" : 
                isPending ? "Confirming..." : 
                Number(amountIn) > 0 ? "Swap" : "Enter an amount"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
