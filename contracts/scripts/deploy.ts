import hre from "hardhat";
import fs from "fs";
import path from "path";

const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("=== BalancerSwap Deployment ===");
  console.log(`Network: ${network.name} (chainId: ${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer balance: ${ethers.formatEther(balance)} ETH`);

  // Check if we already have a partial deployment
  const existingDeployPath = path.join(process.cwd(), "deployment.json");
  let existingDeployment: any = null;
  if (fs.existsSync(existingDeployPath)) {
    existingDeployment = JSON.parse(fs.readFileSync(existingDeployPath, "utf-8"));
    console.log("Found existing partial deployment:", existingDeployment);
  }

  let tokenAddress: string;
  let balToken: any;

  // ── 1. Deploy or reuse BALToken ───────────────────────────────────────────
  if (existingDeployment?.tokenAddress) {
    tokenAddress = existingDeployment.tokenAddress;
    balToken = await ethers.getContractAt("BALToken", tokenAddress);
    console.log(`\n♻️  Reusing BALToken at: ${tokenAddress}`);
  } else {
    console.log("\n📦 Deploying BALToken...");
    const BALToken = await ethers.getContractFactory("BALToken");
    balToken = await BALToken.deploy(deployer.address);
    await balToken.waitForDeployment();
    tokenAddress = await balToken.getAddress();
    console.log(`✅ BALToken deployed: ${tokenAddress}`);
  }

  let dexAddress: string;

  // ── 2. Deploy or reuse BalancerSwap ───────────────────────────────────────
  if (existingDeployment?.dexAddress) {
    dexAddress = existingDeployment.dexAddress;
    console.log(`\n♻️  Reusing BalancerSwap DEX at: ${dexAddress}`);
  } else {
    console.log("\n📦 Deploying BalancerSwap DEX...");

    // Estimate gas needed
    const BalancerSwap = await ethers.getContractFactory("BalancerSwap");
    const feeData = await ethers.provider.getFeeData();
    console.log(`  Base fee: ${feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, "gwei") : "?"} gwei`);
    console.log(`  Max fee per gas: ${feeData.maxFeePerGas ? ethers.formatUnits(feeData.maxFeePerGas, "gwei") : "?"} gwei`);

    const dex = await BalancerSwap.deploy(tokenAddress);
    await dex.waitForDeployment();
    dexAddress = await dex.getAddress();
    console.log(`✅ BalancerSwap deployed: ${dexAddress}`);
  }

  // ── 3. Seed initial liquidity if we have enough ETH ──────────────────────
  const balAfterDeploy = await ethers.provider.getBalance(deployer.address);
  console.log(`\nBalance after deploy: ${ethers.formatEther(balAfterDeploy)} ETH`);

  const dex = await ethers.getContractAt("BalancerSwap", dexAddress);
  const ethReserve = await (dex as any).ethReserve();

  if (ethReserve === 0n && balAfterDeploy > ethers.parseEther("0.0005")) {
    console.log("\n💧 Seeding initial liquidity...");
    const ethSeed = ethers.parseEther("0.0003");
    const tokenSeed = ethers.parseEther("3");

    const approveTx = await balToken.approve(dexAddress, tokenSeed);
    await approveTx.wait();
    console.log("  ✓ Approved DEX to spend BAL");

    const addLiqTx = await (dex as any).addLiquidity(tokenSeed, 0, { value: ethSeed });
    await addLiqTx.wait();
    console.log(`  ✓ Initial liquidity added: 0.0003 ETH + 3 BAL`);
  } else if (ethReserve > 0n) {
    console.log(`\n✓ Pool already has liquidity: ${ethers.formatEther(ethReserve)} ETH`);
  } else {
    console.log("\n⚠️  Skipping initial liquidity seeding (low ETH balance) — add liquidity via the UI");
  }

  // ── 4. Write deployment output ────────────────────────────────────────────
  const deployment = {
    network: network.name,
    chainId: Number(network.chainId),
    tokenAddress,
    dexAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    explorerUrl: `https://sepolia.etherscan.io`,
    tokenExplorerUrl: `https://sepolia.etherscan.io/address/${tokenAddress}`,
    dexExplorerUrl: `https://sepolia.etherscan.io/address/${dexAddress}`,
  };

  fs.writeFileSync(existingDeployPath, JSON.stringify(deployment, null, 2));
  console.log(`\n📄 Deployment saved to deployment.json`);

  console.log("\n=== Deployment Summary ===");
  console.log(`BALToken:     ${tokenAddress}`);
  console.log(`BalancerSwap: ${dexAddress}`);
  console.log(`BALToken:     https://sepolia.etherscan.io/address/${tokenAddress}`);
  console.log(`DEX:          https://sepolia.etherscan.io/address/${dexAddress}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
