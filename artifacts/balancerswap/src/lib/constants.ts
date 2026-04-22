export const BAL_TOKEN_ADDRESS = "0xD347943bFFB4266eD19C78C55CFBcE08DAB27095";
export const DEX_ADDRESS = "0xAf1B9E1cC6af2450f58d4B9B34Ea4EBe457652cA";
export const CHAIN_ID = 11155111;
export const EXPLORER_URL = "https://sepolia.etherscan.io";

export const DEX_ABI = [
  {"inputs":[{"name":"minTokensOut","type":"uint256"}],"name":"swapEthForTokens","outputs":[],"stateMutability":"payable","type":"function"},
  {"inputs":[{"name":"tokenAmount","type":"uint256"},{"name":"minEthOut","type":"uint256"}],"name":"swapTokensForEth","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"name":"tokenAmount","type":"uint256"},{"name":"minLpOut","type":"uint256"}],"name":"addLiquidity","outputs":[{"name":"lpMinted","type":"uint256"}],"stateMutability":"payable","type":"function"},
  {"inputs":[{"name":"lpAmount","type":"uint256"},{"name":"minEthOut","type":"uint256"},{"name":"minTokenOut","type":"uint256"}],"name":"removeLiquidity","outputs":[{"name":"ethOut","type":"uint256"},{"name":"tokenOut","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"name":"ethIn","type":"uint256"}],"name":"getEthToTokenPrice","outputs":[{"name":"tokensOut","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"name":"tokenIn","type":"uint256"}],"name":"getTokenToEthPrice","outputs":[{"name":"ethOut","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"ethReserve","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"tokenReserve","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"name":"account","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
];

export const ERC20_ABI = [
  {"inputs":[{"name":"spender","type":"address"},{"name":"amount","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"name":"account","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"name":"owner","type":"address"},{"name":"spender","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
];
