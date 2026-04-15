const fs = require('fs');
const path = require('path');
const hre = require('hardhat');

async function main() {
  const deploymentPath = path.join(__dirname, '..', 'deployments', 'localhost.json');
  if (!fs.existsSync(deploymentPath)) {
    throw new Error('Deployment file not found. Run deploy:local first.');
  }

  const deployments = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
  const [deployer, trader] = await hre.ethers.getSigners();

  const tokenA = await hre.ethers.getContractAt('MockERC20', deployments.tokenA);
  const tokenB = await hre.ethers.getContractAt('MockERC20', deployments.tokenB);
  const pool = await hre.ethers.getContractAt('LocalSwapPool', deployments.localSwapPool);

  const transferAmount = hre.ethers.parseUnits('1000', 18);
  await (await tokenA.transfer(trader.address, transferAmount)).wait();

  const amountIn = hre.ethers.parseUnits('100', 18);
  const quotedOut = await pool.getAmountOut(amountIn, true);
  const minAmountOut = (quotedOut * 99n) / 100n;

  const tokenABefore = await tokenA.balanceOf(trader.address);
  const tokenBBefore = await tokenB.balanceOf(trader.address);

  await (await tokenA.connect(trader).approve(deployments.localSwapPool, amountIn)).wait();
  await (await pool.connect(trader).swapToken0ForToken1(amountIn, minAmountOut)).wait();

  const tokenAAfter = await tokenA.balanceOf(trader.address);
  const tokenBAfter = await tokenB.balanceOf(trader.address);

  console.log('Swap demo complete');
  console.log('Trader:', trader.address);
  console.log('TokenA before:', hre.ethers.formatUnits(tokenABefore, 18));
  console.log('TokenA after :', hre.ethers.formatUnits(tokenAAfter, 18));
  console.log('TokenB before:', hre.ethers.formatUnits(tokenBBefore, 18));
  console.log('TokenB after :', hre.ethers.formatUnits(tokenBAfter, 18));
  console.log('Quoted out   :', hre.ethers.formatUnits(quotedOut, 18));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});