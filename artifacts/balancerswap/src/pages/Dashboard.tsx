import { useGetDexConfig, useGetPoolStats, useGetPriceHistory, useGetTransactions } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ethers } from "ethers";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: config } = useGetDexConfig();
  const { data: poolStats } = useGetPoolStats();
  const { data: priceHistory } = useGetPriceHistory({ points: 30 });
  const { data: transactions } = useGetTransactions({ limit: 10 });

  const formatEthVal = (weiStr: string | undefined, decimals = 4) => {
    if (!weiStr || weiStr === "0") return "0.0";
    try {
      return Number(ethers.formatEther(weiStr)).toFixed(decimals);
    } catch {
      return "0.0";
    }
  };

  const formatTokenPrice = (priceWei: string | undefined) => {
    if (!priceWei || priceWei === "0") return "0.000000";
    try {
      // priceWei is price * 1e18, so divide by 1e36 to get float
      const raw = BigInt(priceWei);
      const divisor = BigInt("1000000000000000000");
      const integer = raw / divisor;
      const fraction = raw % divisor;
      const floatVal = Number(integer) + Number(fraction) / 1e18;
      return floatVal.toFixed(6);
    } catch {
      return "0.000000";
    }
  };

  const chartData = priceHistory?.map(p => ({
    time: format(new Date(p.timestamp), "MMM dd HH:mm"),
    // ethPrice is stored as BAL-per-ETH * 1e18; normalize to human-readable
    price: (() => {
      try {
        const raw = BigInt(p.ethPrice);
        const divisor = BigInt("1000000000000000000");
        return Number(raw / divisor) + Number(raw % divisor) / 1e18;
      } catch { return 0; }
    })()
  })) || [];

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-6">
            <div className="text-sm text-muted-foreground mb-2">Total Value Locked</div>
            <div className="text-3xl font-mono">{formatEthVal(poolStats?.ethReserve)} ETH</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-6">
            <div className="text-sm text-muted-foreground mb-2">24h Volume</div>
            <div className="text-3xl font-mono">{formatEthVal(poolStats?.volume24h, 6)} ETH</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-6">
            <div className="text-sm text-muted-foreground mb-2">24h Fees (0.3%)</div>
            <div className="text-3xl font-mono text-[hsl(var(--success))]">{formatEthVal(poolStats?.fees24h, 8)} ETH</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-6">
            <div className="text-sm text-muted-foreground mb-2">{config?.tokenSymbol || "BAL"} Price</div>
            <div className="text-3xl font-mono">
              {formatTokenPrice(poolStats?.tokenPrice)} <span className="text-sm text-muted-foreground">ETH</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <Card className="lg:col-span-2 bg-card border-border/50">
          <CardHeader>
            <CardTitle>ETH / {config?.tokenSymbol || "BAL"} Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis 
                      dataKey="time" 
                      stroke="#888888" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="#888888" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(value) => `${value.toFixed(2)}`}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="price" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2} 
                      dot={false} 
                      activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Loading chart data...
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Transactions */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {transactions?.map((tx) => (
                <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                  <div>
                    <div className="font-medium text-sm capitalize">
                      {tx.type.replace('_', ' ')}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {format(new Date(tx.timestamp), "MMM dd, HH:mm")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono">
                      {ethers.formatEther(tx.ethAmount)} ETH
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {ethers.formatEther(tx.tokenAmount)} {config?.tokenSymbol || "BAL"}
                    </div>
                  </div>
                </div>
              ))}
              {!transactions?.length && (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No transactions yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
