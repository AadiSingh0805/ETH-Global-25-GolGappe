const fs = require('fs');
const path = require('path');
const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  const BountyBoard = await hre.ethers.getContractFactory('BountyBoard');
  const bountyBoard = await BountyBoard.deploy();
  await bountyBoard.waitForDeployment();

  const MockERC20 = await hre.ethers.getContractFactory('MockERC20');
  const WETH9 = await hre.ethers.getContractFactory('WETH9');
  const LocalSwapPool = await hre.ethers.getContractFactory('LocalSwapPool');

  const ggpDecimals = 18;
  const btcDecimals = 8;
  const usdcDecimals = 6;

  const tokenA = await MockERC20.deploy('GolGappe Token', 'GGP', hre.ethers.parseUnits('100000000', ggpDecimals), ggpDecimals);
  await tokenA.waitForDeployment();

  const tokenB = await MockERC20.deploy('Wrapped Bitcoin', 'WBTC', hre.ethers.parseUnits('100000000', btcDecimals), btcDecimals);
  await tokenB.waitForDeployment();

  const tokenC = await MockERC20.deploy('Mock USD Coin', 'USDC', hre.ethers.parseUnits('100000000', usdcDecimals), usdcDecimals);
  await tokenC.waitForDeployment();

  const weth = await WETH9.deploy();
  await weth.waitForDeployment();

  const ggpWethPool = await LocalSwapPool.deploy(await weth.getAddress(), await tokenA.getAddress());
  await ggpWethPool.waitForDeployment();

  const wethBtcPool = await LocalSwapPool.deploy(await weth.getAddress(), await tokenB.getAddress());
  await wethBtcPool.waitForDeployment();

  const wethUsdcPool = await LocalSwapPool.deploy(await weth.getAddress(), await tokenC.getAddress());
  await wethUsdcPool.waitForDeployment();

  const ggpLiquidity = hre.ethers.parseUnits('50000', ggpDecimals);
  const wethForGgp = hre.ethers.parseUnits('50', 18);
  await (await weth.deposit({ value: wethForGgp })).wait();
  await (await tokenA.approve(await ggpWethPool.getAddress(), ggpLiquidity)).wait();
  await (await weth.approve(await ggpWethPool.getAddress(), wethForGgp)).wait();
  await (await ggpWethPool.addLiquidity(wethForGgp, ggpLiquidity)).wait();

  const btcReserveEth = hre.ethers.parseUnits('300', 18);
  const btcReserveToken = hre.ethers.parseUnits('10', btcDecimals);
  await (await weth.deposit({ value: btcReserveEth })).wait();
  await (await tokenB.approve(await wethBtcPool.getAddress(), btcReserveToken)).wait();
  await (await weth.approve(await wethBtcPool.getAddress(), btcReserveEth)).wait();
  await (await wethBtcPool.addLiquidity(btcReserveEth, btcReserveToken)).wait();

  const usdcReserveEth = hre.ethers.parseUnits('300', 18);
  const usdcReserveToken = hre.ethers.parseUnits('900000', usdcDecimals);
  await (await weth.deposit({ value: usdcReserveEth })).wait();
  await (await tokenC.approve(await wethUsdcPool.getAddress(), usdcReserveToken)).wait();
  await (await weth.approve(await wethUsdcPool.getAddress(), usdcReserveEth)).wait();
  await (await wethUsdcPool.addLiquidity(usdcReserveEth, usdcReserveToken)).wait();

  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  fs.mkdirSync(deploymentsDir, { recursive: true });
  const deploymentPath = path.join(deploymentsDir, 'localhost.json');
  const deploymentData = {
    network: hre.network.name,
    deployer: deployer.address,
    bountyBoard: await bountyBoard.getAddress(),
    weth: await weth.getAddress(),
    ggp: await tokenA.getAddress(),
    btc: await tokenB.getAddress(),
    usdc: await tokenC.getAddress(),
    tokenA: await tokenA.getAddress(),
    tokenB: await tokenB.getAddress(),
    tokenC: await tokenC.getAddress(),
    localSwapPool: await wethBtcPool.getAddress(),
    wethGgpPool: await ggpWethPool.getAddress(),
    ggpWethPool: await ggpWethPool.getAddress(),
    wethBtcPool: await wethBtcPool.getAddress(),
    wethUsdcPool: await wethUsdcPool.getAddress(),
    wethBusdPool: await wethUsdcPool.getAddress(),
    ggpBusdPool: await ggpWethPool.getAddress()
  };
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));

  console.log('Deployment complete:');
  console.log(JSON.stringify(deploymentData, null, 2));
  console.log('Saved deployment file:', deploymentPath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
