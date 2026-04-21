import { useState } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { useDex } from "@/hooks/use-dex";
import { useGetDexConfig, useGetPoolStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Minus } from "lucide-react";
import { ethers } from "ethers";

export default function Pool() {
  const { address } = useWallet();
  const { data: config } = useGetDexConfig();
  const { data: poolStats } = useGetPoolStats();
  const { addLiquidity, removeLiquidity, isPending } = useDex();

  const [ethAmount, setEthAmount] = useState("");
  const [tokenAmount, setTokenAmount] = useState("");
  const [lpAmount, setLpAmount] = useState("");
  const [slippage] = useState(2); // 2% for pool operations by default

  const handleEthChange = (val: string) => {
    setEthAmount(val);
    if (!poolStats || !val || isNaN(Number(val))) {
      setTokenAmount("");
      return;
    }
    // Calculate required token amount based on reserves
    try {
      const eRes = Number(ethers.formatEther(poolStats.ethReserve));
      const tRes = Number(ethers.formatEther(poolStats.tokenReserve));
      if (eRes > 0 && tRes > 0) {
        const ratio = tRes / eRes;
        setTokenAmount((Number(val) * ratio).toFixed(6));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTokenChange = (val: string) => {
    setTokenAmount(val);
    if (!poolStats || !val || isNaN(Number(val))) {
      setEthAmount("");
      return;
    }
    try {
      const eRes = Number(ethers.formatEther(poolStats.ethReserve));
      const tRes = Number(ethers.formatEther(poolStats.tokenReserve));
      if (eRes > 0 && tRes > 0) {
        const ratio = eRes / tRes;
        setEthAmount((Number(val) * ratio).toFixed(6));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const onAddLiquidity = async () => {
    if (!ethAmount || !tokenAmount) return;
    const minLpOut = "0"; // Simplify for now, ideally calculate min LP minted
    await addLiquidity(ethAmount, tokenAmount, minLpOut);
    setEthAmount("");
    setTokenAmount("");
  };

  const onRemoveLiquidity = async () => {
    if (!lpAmount) return;
    const minEthOut = "0";
    const minTokenOut = "0";
    await removeLiquidity(lpAmount, minEthOut, minTokenOut);
    setLpAmount("");
  };

  return (
    <div className="flex-1 flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-[560px] space-y-6">
        
        {/* Pool Stats Summary */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-card border-border/50">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Total ETH Locked</div>
              <div className="text-xl font-mono">
                {poolStats ? Number(ethers.formatEther(poolStats.ethReserve)).toFixed(2) : "--"}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Total {config?.tokenSymbol || "BAL"} Locked</div>
              <div className="text-xl font-mono">
                {poolStats ? Number(ethers.formatEther(poolStats.tokenReserve)).toFixed(2) : "--"}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/50 bg-card shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-primary/5 blur-[100px] pointer-events-none rounded-full" />
          
          <Tabs defaultValue="add" className="w-full">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-medium">Liquidity</CardTitle>
                  <CardDescription>Provide liquidity to earn fees.</CardDescription>
                </div>
                <TabsList className="bg-secondary/50">
                  <TabsTrigger value="add">Add</TabsTrigger>
                  <TabsTrigger value="remove">Remove</TabsTrigger>
                </TabsList>
              </div>
            </CardHeader>

            <CardContent>
              <TabsContent value="add" className="space-y-4 mt-0">
                <div className="bg-secondary/30 rounded-xl p-4 border border-border/50">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Deposit ETH</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      placeholder="0.0"
                      value={ethAmount}
                      onChange={(e) => handleEthChange(e.target.value)}
                      className="border-0 bg-transparent text-2xl p-0 h-auto font-mono placeholder:text-muted-foreground/30 focus-visible:ring-0 shadow-none"
                    />
                    <div className="bg-secondary px-3 py-1.5 rounded-lg flex items-center gap-2 font-medium shrink-0">
                      ETH
                    </div>
                  </div>
                </div>

                <div className="flex justify-center -my-3 relative z-10">
                  <div className="h-10 w-10 rounded-xl bg-card border border-border/50 flex items-center justify-center text-muted-foreground shadow-sm">
                    <Plus className="w-4 h-4" />
                  </div>
                </div>

                <div className="bg-secondary/30 rounded-xl p-4 border border-border/50">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Deposit {config?.tokenSymbol || "BAL"}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      placeholder="0.0"
                      value={tokenAmount}
                      onChange={(e) => handleTokenChange(e.target.value)}
                      className="border-0 bg-transparent text-2xl p-0 h-auto font-mono placeholder:text-muted-foreground/30 focus-visible:ring-0 shadow-none"
                    />
                    <div className="bg-secondary px-3 py-1.5 rounded-lg flex items-center gap-2 font-medium shrink-0">
                      {config?.tokenSymbol || "BAL"}
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full mt-4 h-12 text-base font-medium shadow-lg shadow-primary/20" 
                  disabled={!address || !ethAmount || !tokenAmount || isPending}
                  onClick={onAddLiquidity}
                >
                  {!address ? "Connect Wallet" : isPending ? "Confirming..." : "Supply"}
                </Button>
              </TabsContent>

              <TabsContent value="remove" className="space-y-4 mt-0">
                <div className="bg-secondary/30 rounded-xl p-4 border border-border/50">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Withdraw LP Tokens</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      placeholder="0.0"
                      value={lpAmount}
                      onChange={(e) => setLpAmount(e.target.value)}
                      className="border-0 bg-transparent text-2xl p-0 h-auto font-mono placeholder:text-muted-foreground/30 focus-visible:ring-0 shadow-none"
                    />
                    <div className="bg-secondary px-3 py-1.5 rounded-lg flex items-center gap-2 font-medium shrink-0">
                      LP
                    </div>
                  </div>
                </div>

                <Button 
                  variant="destructive"
                  className="w-full mt-4 h-12 text-base font-medium shadow-lg shadow-destructive/20" 
                  disabled={!address || !lpAmount || isPending}
                  onClick={onRemoveLiquidity}
                >
                  {!address ? "Connect Wallet" : isPending ? "Confirming..." : "Remove Liquidity"}
                </Button>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
