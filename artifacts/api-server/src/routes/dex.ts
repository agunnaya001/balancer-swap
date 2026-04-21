import { Router } from "express";
import { db } from "@workspace/db";
import { transactionsTable, priceHistoryTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import {
  GetTransactionsQueryParams,
  RecordTransactionBody,
  GetPriceHistoryQueryParams,
} from "@workspace/api-zod";
import { z } from "zod/v4";
import fs from "fs";
import path from "path";

const router = Router();

// Load deployment config from contracts/deployment.json
function loadDeployment() {
  const deployPath = path.resolve(process.cwd(), "../../contracts/deployment.json");
  if (fs.existsSync(deployPath)) {
    return JSON.parse(fs.readFileSync(deployPath, "utf-8"));
  }
  return null;
}

// GET /api/dex/config
router.get("/dex/config", async (req, res) => {
  const deployment = loadDeployment();
  if (!deployment) {
    return res.status(503).json({ error: "Contracts not yet deployed" });
  }

  res.json({
    tokenAddress: deployment.tokenAddress || "",
    dexAddress: deployment.dexAddress || "",
    chainId: deployment.chainId || 11155111,
    chainName: deployment.network || "sepolia",
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
    explorerUrl: deployment.explorerUrl || "https://sepolia.etherscan.io",
    tokenSymbol: "BAL",
    tokenName: "BAL Token",
  });
});

// GET /api/dex/pool-stats
router.get("/dex/pool-stats", async (req, res) => {
  // Return latest recorded price history as pool stats proxy
  // In production this would read from the chain via ethers.js / viem
  const latest = await db
    .select()
    .from(priceHistoryTable)
    .orderBy(desc(priceHistoryTable.recordedAt))
    .limit(1);

  // Volume/fee aggregation for last 24h from transactions
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentTxs = await db
    .select()
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.type, "swap")
      )
    )
    .orderBy(desc(transactionsTable.createdAt));

  const last24h = recentTxs.filter(
    (tx) => new Date(tx.createdAt) >= oneDayAgo
  );

  let volume24h = 0n;
  for (const tx of last24h) {
    volume24h += BigInt(tx.ethAmount);
  }

  const fees24h = (volume24h * 3n) / 1000n; // 0.3% fee

  if (latest.length === 0) {
    return res.json({
      ethReserve: "0",
      tokenReserve: "0",
      totalLiquidity: "0",
      ethPrice: "0",
      tokenPrice: "0",
      tvlUsd: "0",
      volume24h: volume24h.toString(),
      fees24h: fees24h.toString(),
    });
  }

  const ph = latest[0];
  res.json({
    ethReserve: ph.ethReserve,
    tokenReserve: ph.tokenReserve,
    totalLiquidity: "0",
    ethPrice: ph.ethPrice,
    tokenPrice: ph.tokenPrice,
    tvlUsd: "0",
    volume24h: volume24h.toString(),
    fees24h: fees24h.toString(),
  });
});

// GET /api/dex/transactions
router.get("/dex/transactions", async (req, res) => {
  const parsed = GetTransactionsQueryParams.safeParse(req.query);
  const limit = parsed.success ? (parsed.data.limit ?? 20) : 20;
  const typeFilter = parsed.success ? parsed.data.type : undefined;

  let query = db
    .select()
    .from(transactionsTable)
    .orderBy(desc(transactionsTable.createdAt))
    .limit(limit);

  const rows = await query;
  const filtered = typeFilter ? rows.filter((r) => r.type === typeFilter) : rows;

  res.json(
    filtered.map((tx) => ({
      id: tx.id,
      txHash: tx.txHash,
      type: tx.type,
      userAddress: tx.userAddress,
      ethAmount: tx.ethAmount,
      tokenAmount: tx.tokenAmount,
      lpAmount: tx.lpAmount ?? undefined,
      timestamp: tx.createdAt.toISOString(),
      blockNumber: tx.blockNumber ?? undefined,
    }))
  );
});

// POST /api/dex/transactions
router.post("/dex/transactions", async (req, res) => {
  const parsed = RecordTransactionBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body", details: parsed.error });
  }

  const data = parsed.data;
  const [inserted] = await db
    .insert(transactionsTable)
    .values({
      txHash: data.txHash,
      type: data.type,
      userAddress: data.userAddress,
      ethAmount: data.ethAmount,
      tokenAmount: data.tokenAmount,
      lpAmount: data.lpAmount,
      blockNumber: data.blockNumber,
    })
    .returning();

  // Record price snapshot if ethAmount and tokenAmount are non-zero
  if (BigInt(data.ethAmount) > 0n && BigInt(data.tokenAmount) > 0n) {
    const ethR = BigInt(data.ethAmount);
    const tokenR = BigInt(data.tokenAmount);
    const ethPrice = ((tokenR * 10n ** 18n) / ethR).toString();
    const tokenPrice = ((ethR * 10n ** 18n) / tokenR).toString();

    await db.insert(priceHistoryTable).values({
      ethPrice,
      tokenPrice,
      ethReserve: data.ethAmount,
      tokenReserve: data.tokenAmount,
    });
  }

  res.status(201).json({
    id: inserted.id,
    txHash: inserted.txHash,
    type: inserted.type,
    userAddress: inserted.userAddress,
    ethAmount: inserted.ethAmount,
    tokenAmount: inserted.tokenAmount,
    lpAmount: inserted.lpAmount ?? undefined,
    timestamp: inserted.createdAt.toISOString(),
    blockNumber: inserted.blockNumber ?? undefined,
  });
});

// GET /api/dex/price-history
router.get("/dex/price-history", async (req, res) => {
  const parsed = GetPriceHistoryQueryParams.safeParse(req.query);
  const points = parsed.success ? (parsed.data.points ?? 50) : 50;

  const rows = await db
    .select()
    .from(priceHistoryTable)
    .orderBy(desc(priceHistoryTable.recordedAt))
    .limit(points);

  res.json(
    rows.reverse().map((p) => ({
      timestamp: p.recordedAt.toISOString(),
      ethPrice: p.ethPrice,
      tokenPrice: p.tokenPrice,
    }))
  );
});

export default router;
