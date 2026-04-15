// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract LocalSwapPool {
    IERC20 public immutable token0;
    IERC20 public immutable token1;

    uint256 public reserve0;
    uint256 public reserve1;

    event LiquidityAdded(address indexed provider, uint256 amount0, uint256 amount1);
    event Swapped(
        address indexed user,
        address indexed tokenIn,
        uint256 amountIn,
        address indexed tokenOut,
        uint256 amountOut
    );

    constructor(address token0_, address token1_) {
        require(token0_ != address(0) && token1_ != address(0), "Invalid token");
        require(token0_ != token1_, "Tokens must differ");

        token0 = IERC20(token0_);
        token1 = IERC20(token1_);
    }

    function addLiquidity(uint256 amount0, uint256 amount1) external {
        require(amount0 > 0 && amount1 > 0, "Invalid amounts");

        bool sent0 = token0.transferFrom(msg.sender, address(this), amount0);
        bool sent1 = token1.transferFrom(msg.sender, address(this), amount1);
        require(sent0 && sent1, "Transfer failed");

        reserve0 += amount0;
        reserve1 += amount1;

        emit LiquidityAdded(msg.sender, amount0, amount1);
    }

    function getAmountOut(uint256 amountIn, bool token0ToToken1) public view returns (uint256 amountOut) {
        require(amountIn > 0, "amountIn required");

        uint256 reserveIn = token0ToToken1 ? reserve0 : reserve1;
        uint256 reserveOut = token0ToToken1 ? reserve1 : reserve0;
        require(reserveIn > 0 && reserveOut > 0, "No liquidity");

        // 0.30% fee similar to Uniswap v2: amountInWithFee = amountIn * 997
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        amountOut = numerator / denominator;
    }

    function swapToken0ForToken1(uint256 amountIn, uint256 minAmountOut) external returns (uint256 amountOut) {
        amountOut = getAmountOut(amountIn, true);
        require(amountOut >= minAmountOut, "Slippage exceeded");
        require(amountOut <= reserve1, "Insufficient reserve");

        bool received = token0.transferFrom(msg.sender, address(this), amountIn);
        require(received, "Token0 transfer failed");

        reserve0 += amountIn;
        reserve1 -= amountOut;

        bool sent = token1.transfer(msg.sender, amountOut);
        require(sent, "Token1 transfer failed");

        emit Swapped(msg.sender, address(token0), amountIn, address(token1), amountOut);
    }

    function swapToken1ForToken0(uint256 amountIn, uint256 minAmountOut) external returns (uint256 amountOut) {
        amountOut = getAmountOut(amountIn, false);
        require(amountOut >= minAmountOut, "Slippage exceeded");
        require(amountOut <= reserve0, "Insufficient reserve");

        bool received = token1.transferFrom(msg.sender, address(this), amountIn);
        require(received, "Token1 transfer failed");

        reserve1 += amountIn;
        reserve0 -= amountOut;

        bool sent = token0.transfer(msg.sender, amountOut);
        require(sent, "Token0 transfer failed");

        emit Swapped(msg.sender, address(token1), amountIn, address(token0), amountOut);
    }
}