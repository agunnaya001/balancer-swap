import { useState } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { useNetwork } from "@/hooks/use-network";
import { useBalances } from "@/hooks/use-balances";
import { useDex } from "@/hooks/use-dex";
import { useGetDexConfig, useGetPoolStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Loader2, ExternalLink, Droplets } from "lucide-react";
import { ethers } from "ethers";
import { EXPLORER_URL, DEX_ADDRESS } from "@/lib/constants";

function fmt(val: string | number, dp = 4) {
  const n = Number(val);
  if (!n || isNaN(n)) return "0.00";
  if (n < 0.0001) return "<0.0001";
  return n.toLocaleString(undefined, { maximumFractionDigits: dp, minimumFractionDigits: 2 });
}

export default function Pool() {
  const { address } = useWallet();
  const { isCorrectNetwork } = useNetwork();
  const { eth: ethBal, token: tokenBal, lp: lpBal, refetch: refetchBal } = useBalances();
  const { data: config } = useGetDexConfig();
  const { data: poolStats } = useGetPoolStats();
  const { addLiquidity, removeLiquidity, isPending } = useDex();

  const [ethAmount, setEthAmount] = useState("");
  const [tokenAmount, setTokenAmount] = useState("");
  const [lpAmount, setLpAmount] = useState("");
  const [removePercent, setRemovePercent] = useState(50);

  const tokenSymbol = config?.tokenSymbol || "BAL";

  const ethReserve = poolStats ? Number(ethers.formatEther(poolStats.ethReserve)) : 0;
  const tokenReserve = poolStats ? Number(ethers.formatEther(poolStats.tokenReserve)) : 0;
  const totalLp = poolStats ? Number(ethers.formatEther(poolStats.totalLiquidity)) : 0;

  const userShare = totalLp > 0 && Number(lpBal) > 0 ? (Number(lpBal) / totalLp) * 100 : 0;
  const userEthShare = ethReserve * (userShare / 100);
  const userTokenShare = tokenReserve * (userShare / 100);

  const handleEthChange = (val: string) => {
    setEthAmount(val);
    if (!poolStats || !val || isNaN(Number(val))) { setTokenAmount(""); return; }
    try {
      if (ethReserve > 0 && tokenReserve > 0) {
        setTokenAmount(((Number(val) * tokenReserve) / ethReserve).toFixed(6));
      }
    } catch {}
  };

  const handleTokenChange = (val: string) => {
    setTokenAmount(val);
    if (!poolStats || !val || isNaN(Number(val))) { setEthAmount(""); return; }
    try {
      if (ethReserve > 0 && tokenReserve > 0) {
        setEthAmount(((Number(val) * ethReserve) / tokenReserve).toFixed(6));
      }
    } catch {}
  };

  const onAddLiquidity = async () => {
    if (!ethAmount || !tokenAmount) return;
    await addLiquidity(ethAmount, tokenAmount, "0");
    setEthAmount(""); setTokenAmount("");
    setTimeout(refetchBal, 3000);
  };

  const onRemoveLiquidity = async () => {
    const lp = lpAmount || String((Number(lpBal) * removePercent / 100).toFixed(18));
    if (!lp || Number(lp) <= 0) return;
    await removeLiquidity(lp, "0", "0");
    setLpAmount("");
    setTimeout(refetchBal, 3000);
  };

  const lpToRemove = lpAmount
    ? Number(lpAmount)
    : Number(lpBal) * removePercent / 100;
  const shareToRemove = totalLp > 0 ? lpToRemove / totalLp : 0;

  return (
    <div className="flex-1 flex flex-col items-center py-6 px-4">
      <div className="w-full max-w-[560px] space-y-5">

        {/* Pool stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "ETH Reserve", value: fmt(String(ethReserve)), unit: "ETH" },
            { label: `${tokenSymbol} Reserve`, value: fmt(String(tokenReserve)), unit: tokenSymbol },
            { label: "Your Share", value: userShare > 0 ? userShare.toFixed(2) + "%" : "0%", unit: "" },
            { label: "Pool Fee", value: "0.3", unit: "%" },
          ].map(({ label, value, unit }) => (
            <Card key={label} className="bg-card border-border/50">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-1">{label}</div>
                <div className="text-lg font-mono font-semibold">{value}<span className="text-sm text-muted-foreground ml-1">{unit}</span></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Your position */}
        {address && Number(lpBal) > 0 && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Droplets className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">Your Position</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">LP Tokens</div>
                  <div className="font-mono font-medium">{fmt(lpBal, 6)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">ETH Value</div>
                  <div className="font-mono font-medium">{fmt(String(userEthShare))} ETH</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{tokenSymbol} Value</div>
                  <div className="font-mono font-medium">{fmt(String(userTokenShare))} {tokenSymbol}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main card */}
        <Card className="border-border/50 bg-card shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-primary/5 blur-[100px] pointer-events-none rounded-full" />

          <Tabs defaultValue="add" className="w-full">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-medium">Liquidity</CardTitle>
                  <CardDescription>Provide liquidity to earn 0.3% on every swap.</CardDescription>
                </div>
                <TabsList className="bg-secondary/50">
                  <TabsTrigger value="add">Add</TabsTrigger>
                  <TabsTrigger value="remove">Remove</TabsTrigger>
                </TabsList>
              </div>
            </CardHeader>

            <CardContent>
              {/* Add liquidity */}
              <TabsContent value="add" className="space-y-4 mt-0">
                <div className="bg-secondary/30 rounded-xl p-4 border border-border/50 hover:border-primary/30 transition-colors">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Deposit ETH</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Balance: {address ? fmt(ethBal) : "--"}</span>
                      {address && Number(ethBal) > 0 && (
                        <button onClick={() => handleEthChange(String(Math.max(0, Number(ethBal) - 0.001).toFixed(6)))}
                          className="text-xs text-primary font-semibold hover:text-primary/80">MAX</button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input type="number" inputMode="decimal" placeholder="0.0" value={ethAmount} onChange={e => handleEthChange(e.target.value)}
                      className="border-0 bg-transparent text-2xl p-0 h-auto font-mono placeholder:text-muted-foreground/30 focus-visible:ring-0 shadow-none" />
                    <div className="bg-secondary px-3 py-2 rounded-xl font-semibold text-sm shrink-0">ETH</div>
                  </div>
                </div>

                <div className="flex justify-center -my-3 relative z-10">
                  <div className="h-10 w-10 rounded-xl bg-card border border-border/50 flex items-center justify-center text-muted-foreground shadow-sm">
                    <Plus className="w-4 h-4" />
                  </div>
                </div>

                <div className="bg-secondary/30 rounded-xl p-4 border border-border/50 hover:border-primary/30 transition-colors">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Deposit {tokenSymbol}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Balance: {address ? fmt(tokenBal) : "--"}</span>
                      {address && Number(tokenBal) > 0 && (
                        <button onClick={() => handleTokenChange(String(Number(tokenBal).toFixed(6)))}
                          className="text-xs text-primary font-semibold hover:text-primary/80">MAX</button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input type="number" inputMode="decimal" placeholder="0.0" value={tokenAmount} onChange={e => handleTokenChange(e.target.value)}
                      className="border-0 bg-transparent text-2xl p-0 h-auto font-mono placeholder:text-muted-foreground/30 focus-visible:ring-0 shadow-none" />
                    <div className="bg-secondary px-3 py-2 rounded-xl font-semibold text-sm shrink-0">{tokenSymbol}</div>
                  </div>
                </div>

                {ethAmount && tokenAmount && Number(ethAmount) > 0 && (
                  <div className="px-1 py-2 space-y-1.5 text-sm border-t border-border/30">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pool ratio</span>
                      <span className="font-mono text-xs">1 ETH = {ethReserve > 0 ? (tokenReserve / ethReserve).toFixed(4) : "—"} {tokenSymbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Your share</span>
                      <span className="font-mono text-xs">
                        {totalLp > 0 && ethReserve > 0
                          ? ((Number(ethAmount) / (ethReserve + Number(ethAmount))) * 100).toFixed(3)
                          : "100.000"}%
                      </span>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20 active:scale-[0.99] transition-transform"
                  disabled={!address || !isCorrectNetwork || !ethAmount || !tokenAmount || isPending}
                  onClick={onAddLiquidity}
                >
                  {isPending ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Confirming…</span>
                    : !address ? "Connect Wallet"
                    : !isCorrectNetwork ? "Switch to Sepolia"
                    : "Supply Liquidity"}
                </Button>
              </TabsContent>

              {/* Remove liquidity */}
              <TabsContent value="remove" className="space-y-4 mt-0">
                {Number(lpBal) === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm">
                    <Droplets className="w-8 h-8 mx-auto mb-3 opacity-30" />
                    <p>You have no liquidity position yet.</p>
                    <p className="text-xs mt-1">Add liquidity first to earn fees.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-muted-foreground">Amount to remove</div>
                      <div className="flex gap-2">
                        {[25, 50, 75, 100].map(p => (
                          <button key={p}
                            onClick={() => { setRemovePercent(p); setLpAmount(""); }}
                            className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                              removePercent === p && !lpAmount
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-secondary/50 text-muted-foreground border-border/50 hover:border-primary/50"
                            }`}>
                            {p}%
                          </button>
                        ))}
                      </div>

                      <div className="bg-secondary/30 rounded-xl p-4 border border-border/50">
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-muted-foreground">LP Tokens</span>
                          <span className="text-xs text-muted-foreground">Balance: {fmt(lpBal, 6)}</span>
                        </div>
                        <Input type="number" inputMode="decimal" placeholder={String((Number(lpBal) * removePercent / 100).toFixed(6))}
                          value={lpAmount} onChange={e => setLpAmount(e.target.value)}
                          className="border-0 bg-transparent text-2xl p-0 h-auto font-mono placeholder:text-muted-foreground/30 focus-visible:ring-0 shadow-none" />
                      </div>
                    </div>

                    {lpToRemove > 0 && totalLp > 0 && (
                      <div className="px-1 py-2 space-y-1.5 text-sm border-t border-border/30">
                        <div className="text-xs text-muted-foreground font-medium mb-1">You will receive</div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">ETH</span>
                          <span className="font-mono text-xs">{fmt(String(ethReserve * shareToRemove))} ETH</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{tokenSymbol}</span>
                          <span className="font-mono text-xs">{fmt(String(tokenReserve * shareToRemove))} {tokenSymbol}</span>
                        </div>
                      </div>
                    )}

                    <Button
                      variant="destructive"
                      className="w-full h-12 text-base font-semibold shadow-lg shadow-destructive/20 active:scale-[0.99] transition-transform"
                      disabled={!address || !isCorrectNetwork || isPending || lpToRemove <= 0}
                      onClick={onRemoveLiquidity}
                    >
                      {isPending ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Confirming…</span>
                        : "Remove Liquidity"}
                    </Button>
                  </>
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        {DEX_ADDRESS && (
          <div className="text-center">
            <a href={`${EXPLORER_URL}/address/${DEX_ADDRESS}`} target="_blank" rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1">
              View pool on Etherscan <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
