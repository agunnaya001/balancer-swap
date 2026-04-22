import { useState, useEffect } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { useNetwork } from "@/hooks/use-network";
import { useBalances } from "@/hooks/use-balances";
import { useDex } from "@/hooks/use-dex";
import { useGetDexConfig, useGetPoolStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, ArrowDownUp, ExternalLink, Loader2 } from "lucide-react";
import { ethers } from "ethers";
import { Skeleton } from "@/components/ui/skeleton";
import { EXPLORER_URL, DEX_ADDRESS } from "@/lib/constants";

function fmt(val: string, dp = 4) {
  const n = Number(val);
  if (!n || isNaN(n)) return "0.00";
  if (n < 0.0001) return "<0.0001";
  return n.toLocaleString(undefined, { maximumFractionDigits: dp, minimumFractionDigits: 2 });
}

export default function Swap() {
  const { address } = useWallet();
  const { isCorrectNetwork } = useNetwork();
  const { eth: ethBal, token: tokenBal, refetch: refetchBal } = useBalances();
  const { data: config } = useGetDexConfig();
  const { data: poolStats } = useGetPoolStats();
  const { swapEthForTokens, swapTokensForEth, getQuote, isPending } = useDex();

  const [isEthIn, setIsEthIn] = useState(true);
  const [amountIn, setAmountIn] = useState("");
  const [amountOut, setAmountOut] = useState("");
  const [slippage, setSlippage] = useState(0.5);
  const [isQuoting, setIsQuoting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const balanceIn = isEthIn ? ethBal : tokenBal;
  const balanceOut = isEthIn ? tokenBal : ethBal;
  const tokenSymbol = config?.tokenSymbol || "BAL";

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
    const timer = setTimeout(fetchQuote, 400);
    return () => clearTimeout(timer);
  }, [amountIn, isEthIn, getQuote]);

  const handleSwap = async () => {
    if (!amountIn || !amountOut) return;
    const minOut = (Number(amountOut) * (1 - slippage / 100)).toFixed(18);
    if (isEthIn) {
      await swapEthForTokens(amountIn, minOut);
    } else {
      await swapTokensForEth(amountIn, minOut);
    }
    setAmountIn("");
    setAmountOut("");
    setTimeout(refetchBal, 3000);
  };

  const toggleDirection = () => {
    setIsEthIn(p => !p);
    setAmountIn(amountOut);
    setAmountOut("");
  };

  const setMax = () => {
    const max = isEthIn
      ? String(Math.max(0, Number(ethBal) - 0.001).toFixed(6))
      : String(Number(tokenBal).toFixed(6));
    setAmountIn(max);
  };

  const priceImpact = (() => {
    if (!poolStats || !amountIn || Number(amountIn) <= 0) return 0;
    try {
      const inWei = ethers.parseEther(amountIn);
      const reserveWei = BigInt(isEthIn ? poolStats.ethReserve : poolStats.tokenReserve);
      if (reserveWei === 0n) return 0;
      return (Number(inWei) / Number(reserveWei)) * 100;
    } catch { return 0; }
  })();

  const insufficientBalance = !!address && Number(amountIn) > Number(balanceIn);
  const canSwap = !!address && isCorrectNetwork && !!amountIn && !!amountOut && !isPending && Number(amountIn) > 0 && !insufficientBalance;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-4">
      <div className="w-full max-w-[480px] space-y-3">

        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>Sepolia Testnet · 0.3% Fee</span>
          {DEX_ADDRESS && (
            <a
              href={`${EXPLORER_URL}/address/${DEX_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              Contract <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        <Card className="border-border/50 bg-card shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-primary/10 blur-[100px] pointer-events-none rounded-full" />

          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-xl font-medium">Swap</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 transition-colors ${showSettings ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setShowSettings(p => !p)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </CardHeader>

          <CardContent className="space-y-2">
            {showSettings && (
              <div className="bg-secondary/30 rounded-xl p-4 border border-border/50 space-y-3">
                <div className="text-sm font-medium">Settings</div>
                <div>
                  <div className="text-xs text-muted-foreground mb-2">Slippage Tolerance</div>
                  <div className="flex gap-2">
                    {[0.1, 0.5, 1, 2].map(s => (
                      <button
                        key={s}
                        onClick={() => setSlippage(s)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                          slippage === s
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-secondary/50 text-muted-foreground border-border/50 hover:border-primary/50"
                        }`}
                      >
                        {s}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Input box */}
            <div className="bg-secondary/30 rounded-xl p-4 border border-border/50 hover:border-primary/30 transition-colors">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">You pay</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Balance: {address ? fmt(balanceIn) : "--"}
                  </span>
                  {address && Number(balanceIn) > 0 && (
                    <button
                      onClick={setMax}
                      className="text-xs text-primary hover:text-primary/80 font-semibold transition-colors"
                    >
                      MAX
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0.0"
                  value={amountIn}
                  onChange={e => setAmountIn(e.target.value)}
                  className="border-0 bg-transparent text-3xl p-0 h-auto font-mono placeholder:text-muted-foreground/30 focus-visible:ring-0 shadow-none"
                />
                <div className="bg-secondary px-3 py-2 rounded-xl flex items-center gap-2 font-semibold text-sm shrink-0">
                  <span className={`w-2 h-2 rounded-full ${isEthIn ? "bg-primary" : "bg-blue-400"}`} />
                  {isEthIn ? "ETH" : tokenSymbol}
                </div>
              </div>
            </div>

            {/* Toggle */}
            <div className="flex justify-center -my-3 relative z-10">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-xl bg-card border-border/50 text-muted-foreground hover:text-primary hover:border-primary/50 shadow-sm transition-all active:scale-95"
                onClick={toggleDirection}
              >
                <ArrowDownUp className="w-4 h-4" />
              </Button>
            </div>

            {/* Output box */}
            <div className="bg-secondary/30 rounded-xl p-4 border border-border/50">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">You receive</span>
                <span className="text-xs text-muted-foreground">
                  Balance: {address ? fmt(balanceOut) : "--"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {isQuoting ? (
                  <Skeleton className="h-9 w-36 bg-secondary" />
                ) : (
                  <Input
                    readOnly
                    value={amountOut ? fmt(amountOut) : "0.0"}
                    className="border-0 bg-transparent text-3xl p-0 h-auto font-mono text-muted-foreground focus-visible:ring-0 shadow-none pointer-events-none"
                  />
                )}
                <div className="bg-secondary px-3 py-2 rounded-xl flex items-center gap-2 font-semibold text-sm shrink-0">
                  <span className={`w-2 h-2 rounded-full ${!isEthIn ? "bg-primary" : "bg-blue-400"}`} />
                  {!isEthIn ? "ETH" : tokenSymbol}
                </div>
              </div>
            </div>

            {/* Trade details */}
            {amountOut && Number(amountOut) > 0 && (
              <div className="py-2 px-1 space-y-1.5 border-t border-border/30">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Rate</span>
                  <span className="font-mono text-xs">
                    1 {isEthIn ? "ETH" : tokenSymbol} ≈ {(Number(amountOut) / Number(amountIn)).toFixed(4)} {!isEthIn ? "ETH" : tokenSymbol}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Price Impact</span>
                  <span className={`font-mono font-medium text-xs ${
                    priceImpact > 5 ? "text-destructive" : priceImpact > 2 ? "text-yellow-400" : "text-green-400"
                  }`}>
                    {priceImpact < 0.01 ? "<0.01" : priceImpact.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Min. received</span>
                  <span className="font-mono text-xs">
                    {fmt(String(Number(amountOut) * (1 - slippage / 100)))} {!isEthIn ? "ETH" : tokenSymbol}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fee (0.3%)</span>
                  <span className="font-mono text-xs">
                    {fmt(String(Number(amountIn) * 0.003))} {isEthIn ? "ETH" : tokenSymbol}
                  </span>
                </div>
              </div>
            )}

            {insufficientBalance && (
              <p className="text-sm text-destructive text-center py-1">
                Insufficient {isEthIn ? "ETH" : tokenSymbol} balance
              </p>
            )}

            <Button
              className="w-full mt-2 h-14 text-base font-semibold shadow-lg shadow-primary/20 active:scale-[0.99] transition-transform"
              size="lg"
              disabled={!canSwap}
              onClick={handleSwap}
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Confirming…
                </span>
              ) : !address ? "Connect Wallet to Swap"
                : !isCorrectNetwork ? "Switch to Sepolia"
                : insufficientBalance ? `Insufficient ${isEthIn ? "ETH" : tokenSymbol}`
                : Number(amountIn) > 0 ? "Swap"
                : "Enter an amount"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
