const hre = require('hardhat');

async function main() {
  const BountyBoard = await hre.ethers.getContractFactory('BountyBoard');
  const bountyBoard = await BountyBoard.deploy();
  await bountyBoard.waitForDeployment();

  console.log('BountyBoard deployed to:', await bountyBoard.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
