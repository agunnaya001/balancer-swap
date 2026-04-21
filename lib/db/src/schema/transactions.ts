import { pgTable, text, integer, serial, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const transactionsTable = pgTable("dex_transactions", {
  id: serial("id").primaryKey(),
  txHash: text("tx_hash").notNull().unique(),
  type: text("type", { enum: ["swap", "add_liquidity", "remove_liquidity"] }).notNull(),
  userAddress: text("user_address").notNull(),
  ethAmount: text("eth_amount").notNull().default("0"),
  tokenAmount: text("token_amount").notNull().default("0"),
  lpAmount: text("lp_amount"),
  blockNumber: integer("block_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const priceHistoryTable = pgTable("dex_price_history", {
  id: serial("id").primaryKey(),
  ethPrice: text("eth_price").notNull(),
  tokenPrice: text("token_price").notNull(),
  ethReserve: text("eth_reserve").notNull(),
  tokenReserve: text("token_reserve").notNull(),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, createdAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;

export const insertPriceHistorySchema = createInsertSchema(priceHistoryTable).omit({ id: true, recordedAt: true });
export type InsertPriceHistory = z.infer<typeof insertPriceHistorySchema>;
export type PriceHistory = typeof priceHistoryTable.$inferSelect;
