# BalancerSwap DEX

## Overview

A decentralized exchange (DEX) built with a constant-product AMM (Uniswap v2 style). Users swap ETH ↔ $BAL tokens, provide/remove liquidity, and view pool analytics. Deployed to Ethereum Sepolia testnet.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React 19 + Vite 7 (artifacts/balancerswap)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Smart Contracts**: Solidity 0.8.24, Hardhat 2.22, OpenZeppelin 5
- **Blockchain**: ethers.js v6

## Smart Contracts (Sepolia Testnet)

| Contract | Address |
|---|---|
| BALToken (ERC-20) | `0xD347943bFFB4266eD19C78C55CFBcE08DAB27095` |
| BalancerSwap (DEX) | *pending deployment — wallet needs more Sepolia ETH* |

- **Deployer**: `0xFfb6505912FCE95B42be4860477201bb4e204E9f`
- **To deploy DEX**: add Sepolia ETH to deployer wallet, then `cd contracts && npm run deploy`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/balancerswap run dev` — run frontend locally
- `cd contracts && npm run deploy` — deploy to Sepolia (needs `DEPLOYER_PRIVATE_KEY`, `SEPOLIA_RPC_URL`, `ETHERSCAN_API_KEY`)
- `cd contracts && npm run compile` — compile Solidity contracts

## DB Schema

- `dex_transactions` — records swap/add_liquidity/remove_liquidity events
- `dex_price_history` — ETH/BAL price history snapshots

## Architecture

- `contracts/` — Hardhat project with BALToken.sol and BalancerSwap.sol
- `artifacts/balancerswap/` — React + Vite DEX frontend (swap, pool, dashboard pages)
- `artifacts/api-server/` — Express API (dex config, pool stats, transactions, price history)
- `lib/api-spec/` — OpenAPI 3.1 spec
- `lib/api-client-react/` — Auto-generated TanStack Query hooks
- `lib/api-zod/` — Auto-generated Zod validators
- `lib/db/` — Drizzle ORM schema + DB connection
