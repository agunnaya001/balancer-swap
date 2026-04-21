// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BalancerSwap
 * @notice Constant-product AMM (x * y = k) for ETH <-> BAL swaps.
 *
 * Design:
 *  - ETH is the native asset.
 *  - BAL is an ERC-20 token held by this contract as the other reserve.
 *  - LP tokens are minted to liquidity providers representing their share.
 *  - A 0.3% fee is charged on every swap, retained in the pool for LPs.
 *
 * Invariant: ethReserve * tokenReserve = k (after fees)
 */
contract BalancerSwap is ERC20, ReentrancyGuard {

    // ─── State ────────────────────────────────────────────────────────────────

    IERC20 public immutable token;  // BAL token
    uint256 public ethReserve;
    uint256 public tokenReserve;

    uint256 public constant FEE_NUMERATOR = 997;    // 0.3% fee
    uint256 public constant FEE_DENOMINATOR = 1000;
    uint256 public constant MINIMUM_LIQUIDITY = 1000; // Lock minimum liquidity to prevent division-by-zero

    // ─── Events ───────────────────────────────────────────────────────────────

    event Swap(
        address indexed sender,
        uint256 ethIn,
        uint256 tokenIn,
        uint256 ethOut,
        uint256 tokenOut
    );

    event AddLiquidity(
        address indexed provider,
        uint256 ethAmount,
        uint256 tokenAmount,
        uint256 lpMinted
    );

    event RemoveLiquidity(
        address indexed provider,
        uint256 ethAmount,
        uint256 tokenAmount,
        uint256 lpBurned
    );

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address _token) ERC20("BalancerSwap LP", "BALP") {
        require(_token != address(0), "Invalid token address");
        token = IERC20(_token);
    }

    // ─── Swap: ETH → Token ───────────────────────────────────────────────────

    /**
     * @notice Swap ETH for BAL tokens.
     * @param minTokensOut Minimum BAL to receive (slippage guard).
     */
    function swapEthForTokens(uint256 minTokensOut) external payable nonReentrant {
        require(msg.value > 0, "Must send ETH");
        require(ethReserve > 0 && tokenReserve > 0, "Pool has no liquidity");

        uint256 ethIn = msg.value;
        uint256 tokensOut = _getAmountOut(ethIn, ethReserve, tokenReserve);

        require(tokensOut >= minTokensOut, "Slippage: insufficient output");
        require(tokensOut < tokenReserve, "Insufficient token reserve");

        ethReserve += ethIn;
        tokenReserve -= tokensOut;

        require(token.transfer(msg.sender, tokensOut), "Token transfer failed");

        emit Swap(msg.sender, ethIn, 0, 0, tokensOut);
    }

    // ─── Swap: Token → ETH ───────────────────────────────────────────────────

    /**
     * @notice Swap BAL tokens for ETH.
     * @param tokenAmount Amount of BAL to swap.
     * @param minEthOut Minimum ETH to receive (slippage guard).
     */
    function swapTokensForEth(uint256 tokenAmount, uint256 minEthOut) external nonReentrant {
        require(tokenAmount > 0, "Must provide tokens");
        require(ethReserve > 0 && tokenReserve > 0, "Pool has no liquidity");

        uint256 ethOut = _getAmountOut(tokenAmount, tokenReserve, ethReserve);

        require(ethOut >= minEthOut, "Slippage: insufficient output");
        require(ethOut < ethReserve, "Insufficient ETH reserve");

        tokenReserve += tokenAmount;
        ethReserve -= ethOut;

        require(token.transferFrom(msg.sender, address(this), tokenAmount), "Token transfer failed");
        (bool sent, ) = msg.sender.call{value: ethOut}("");
        require(sent, "ETH transfer failed");

        emit Swap(msg.sender, 0, tokenAmount, ethOut, 0);
    }

    // ─── Liquidity: Add ──────────────────────────────────────────────────────

    /**
     * @notice Add liquidity and receive LP tokens.
     * @param tokenAmount BAL tokens to deposit.
     * @param minLpOut Minimum LP tokens to receive.
     * @dev ETH is provided as msg.value.
     */
    function addLiquidity(uint256 tokenAmount, uint256 minLpOut)
        external
        payable
        nonReentrant
        returns (uint256 lpMinted)
    {
        require(msg.value > 0, "Must send ETH");
        require(tokenAmount > 0, "Must provide tokens");

        uint256 totalLp = totalSupply();

        if (totalLp == 0) {
            // First deposit: mint based on geometric mean and lock MINIMUM_LIQUIDITY
            lpMinted = _sqrt(msg.value * tokenAmount) - MINIMUM_LIQUIDITY;
            // Mint MINIMUM_LIQUIDITY to zero address permanently to prevent pool drainage
            _mint(address(0xdead), MINIMUM_LIQUIDITY);
        } else {
            // Subsequent deposits: proportional to existing reserves
            uint256 lpFromEth = (msg.value * totalLp) / ethReserve;
            uint256 lpFromToken = (tokenAmount * totalLp) / tokenReserve;
            lpMinted = lpFromEth < lpFromToken ? lpFromEth : lpFromToken;
        }

        require(lpMinted >= minLpOut, "Slippage: insufficient LP");
        require(lpMinted > 0, "Insufficient liquidity minted");

        ethReserve += msg.value;
        tokenReserve += tokenAmount;

        require(token.transferFrom(msg.sender, address(this), tokenAmount), "Token transfer failed");
        _mint(msg.sender, lpMinted);

        emit AddLiquidity(msg.sender, msg.value, tokenAmount, lpMinted);
    }

    // ─── Liquidity: Remove ────────────────────────────────────────────────────

    /**
     * @notice Burn LP tokens and receive ETH + BAL.
     * @param lpAmount LP tokens to burn.
     * @param minEthOut Minimum ETH to receive.
     * @param minTokenOut Minimum BAL to receive.
     */
    function removeLiquidity(uint256 lpAmount, uint256 minEthOut, uint256 minTokenOut)
        external
        nonReentrant
        returns (uint256 ethOut, uint256 tokenOut)
    {
        require(lpAmount > 0, "Must provide LP tokens");
        uint256 totalLp = totalSupply();
        require(totalLp > 0, "No liquidity");

        ethOut = (lpAmount * ethReserve) / totalLp;
        tokenOut = (lpAmount * tokenReserve) / totalLp;

        require(ethOut >= minEthOut, "Slippage: insufficient ETH");
        require(tokenOut >= minTokenOut, "Slippage: insufficient tokens");
        require(ethOut < ethReserve, "Insufficient ETH reserve");
        require(tokenOut < tokenReserve, "Insufficient token reserve");

        ethReserve -= ethOut;
        tokenReserve -= tokenOut;

        _burn(msg.sender, lpAmount);
        require(token.transfer(msg.sender, tokenOut), "Token transfer failed");
        (bool sent, ) = msg.sender.call{value: ethOut}("");
        require(sent, "ETH transfer failed");

        emit RemoveLiquidity(msg.sender, ethOut, tokenOut, lpAmount);
    }

    // ─── Price Queries ────────────────────────────────────────────────────────

    /**
     * @notice Calculate output tokens for a given input (0.3% fee applied).
     * @dev  amountOut = (amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997)
     */
    function getEthToTokenPrice(uint256 ethIn) external view returns (uint256 tokensOut) {
        require(ethReserve > 0 && tokenReserve > 0, "No liquidity");
        tokensOut = _getAmountOut(ethIn, ethReserve, tokenReserve);
    }

    function getTokenToEthPrice(uint256 tokenIn) external view returns (uint256 ethOut) {
        require(ethReserve > 0 && tokenReserve > 0, "No liquidity");
        ethOut = _getAmountOut(tokenIn, tokenReserve, ethReserve);
    }

    /**
     * @notice Get current spot price (1 ETH in BAL, no fee).
     */
    function getSpotPrice() external view returns (uint256 tokenPerEth) {
        require(ethReserve > 0, "No liquidity");
        tokenPerEth = (tokenReserve * 1e18) / ethReserve;
    }

    // ─── Internal Helpers ─────────────────────────────────────────────────────

    function _getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal pure returns (uint256) {
        require(amountIn > 0, "Insufficient input");
        require(reserveIn > 0 && reserveOut > 0, "Insufficient liquidity");
        uint256 amountInWithFee = amountIn * FEE_NUMERATOR;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * FEE_DENOMINATOR) + amountInWithFee;
        return numerator / denominator;
    }

    function _sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    receive() external payable {}
}
