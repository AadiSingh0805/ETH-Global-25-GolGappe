import fs from 'fs';
import { fileURLToPath } from 'url';
import { ethers } from 'ethers';

export const BOUNTY_BOARD_ABI = [
  'event RepoRegistered(uint256 indexed repoId, string repoUrl, address indexed owner)',
  'event RepoDonation(uint256 indexed repoId, uint256 amount, address indexed donor)',
  'event BountyCreated(uint256 indexed repoId, uint256 indexed issueId, string issueUrl, uint256 amount, address indexed creator)',
  'event BountyClaimed(uint256 indexed repoId, uint256 indexed issueId, address indexed recipient, uint256 amount)',
  'function registerRepo(uint256 repoId, string repoUrl)',
  'function donateToRepo(uint256 repoId) payable',
  'function createBounty(uint256 repoId, uint256 issueId, string issueUrl) payable',
  'function claimBounty(uint256 repoId, uint256 issueId, address recipient)',
  'function getRepoIds() view returns (uint256[])',
  'function getRepo(uint256 repoId) view returns (string repoUrl, address owner, bool exists, uint256 pool, uint256[] issueIds)',
  'function getRepoIssueIds(uint256 repoId) view returns (uint256[])',
  'function getBounty(uint256 repoId, uint256 issueId) view returns (bool exists, string issueUrl, uint256 amount, address creator, address recipient, bool claimed)'
];

export const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

export const WETH_ABI = [
  ...ERC20_ABI,
  'function deposit() payable',
  'function withdraw(uint256 amount)'
];

export const LOCAL_SWAP_POOL_ABI = [
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function getAmountOut(uint256 amountIn, bool token0ToToken1) view returns (uint256 amountOut)',
  'function swapToken0ForToken1(uint256 amountIn, uint256 minAmountOut) returns (uint256 amountOut)',
  'function swapToken1ForToken0(uint256 amountIn, uint256 minAmountOut) returns (uint256 amountOut)'
];

const DEFAULT_LOCAL_DEPLOYMENT_PATH = fileURLToPath(new URL('../../chain/deployments/localhost.json', import.meta.url));

let providerInstance = null;

export const isBlockchainEnabled = () => process.env.BLOCKCHAIN_ENABLED === 'true';

export const getProvider = () => {
  if (providerInstance) {
    return providerInstance;
  }

  const rpcUrl = process.env.RPC_URL || 'http://127.0.0.1:8545';
  providerInstance = new ethers.JsonRpcProvider(rpcUrl);
  return providerInstance;
};

export const getSigner = () => {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY is required when BLOCKCHAIN_ENABLED=true');
  }

  const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  const wallet = new ethers.Wallet(formattedKey, getProvider());
  // Use a fresh nonce manager per call so local chain resets do not leave a stale cached nonce.
  return new ethers.NonceManager(wallet);
};

export const maybeAutofundSigner = async (requiredWei = 0n) => {
  const shouldAutofund = String(process.env.AUTOFUND_SIGNER || 'false') === 'true';
  const faucetPrivateKey = process.env.FAUCET_PRIVATE_KEY;

  const signer = getSigner();
  const signerAddress = await signer.getAddress();

  if (!shouldAutofund || !faucetPrivateKey) {
    return signer;
  }

  const provider = getProvider();
  const signerBalance = await provider.getBalance(signerAddress);
  const targetBalance = requiredWei + ethers.parseEther('0.5');

  if (signerBalance >= targetBalance) {
    return signer;
  }

  const topUpAmount = targetBalance - signerBalance;
  const faucet = new ethers.Wallet(faucetPrivateKey.startsWith('0x') ? faucetPrivateKey : `0x${faucetPrivateKey}`, provider);
  const faucetTx = await faucet.sendTransaction({
    to: signerAddress,
    value: topUpAmount
  });
  await faucetTx.wait();

  return signer;
};

export const getBountyBoardContract = (signerOrProvider = null) => {
  const contractAddress = getBountyBoardAddress();
  if (!contractAddress) {
    throw new Error('BOUNTY_BOARD_ADDRESS is not configured');
  }

  return new ethers.Contract(
    contractAddress,
    BOUNTY_BOARD_ABI,
    signerOrProvider || getProvider()
  );
};

export const getLocalDeployment = () => {
  const deploymentPath = process.env.CHAIN_DEPLOYMENT_FILE || DEFAULT_LOCAL_DEPLOYMENT_PATH;

  if (!fs.existsSync(deploymentPath)) {
    return null;
  }

  const raw = fs.readFileSync(deploymentPath, 'utf-8');
  return JSON.parse(raw);
};

export const getBountyBoardAddress = () => {
  const deployment = getLocalDeployment();
  const deploymentAddress = deployment?.bountyBoard;

  if (deploymentAddress && ethers.isAddress(deploymentAddress)) {
    return deploymentAddress;
  }

  const envAddress = String(process.env.BOUNTY_BOARD_ADDRESS || '').trim();
  if (envAddress && ethers.isAddress(envAddress)) {
    return envAddress;
  }

  return null;
};

export const getLocalSwapContracts = (signerOrProvider = null) => {
  const deployment = getLocalDeployment();
  if (!deployment) {
    throw new Error('Local chain deployment file not found. Run `cd chain && npm run deploy:local` first.');
  }

  if (!deployment.weth || !deployment.ggp || (!deployment.btc && !deployment.tokenB) || (!deployment.usdc && !deployment.tokenC)) {
    throw new Error('Deployment file is missing swap contract addresses. Re-run `cd chain && npm run deploy:local`.');
  }

  const connection = signerOrProvider || getProvider();
  const weth = new ethers.Contract(deployment.weth, WETH_ABI, connection);
  const ggp = new ethers.Contract(deployment.ggp || deployment.tokenA, ERC20_ABI, connection);
  const btc = new ethers.Contract(deployment.btc || deployment.tokenB, ERC20_ABI, connection);
  const usdc = new ethers.Contract(deployment.usdc || deployment.tokenC, ERC20_ABI, connection);

  return {
    deployment,
    weth,
    ggp,
    btc,
    usdc,
    busd: usdc,
    ggpWethPool: (deployment.ggpWethPool || deployment.wethGgpPool || deployment.ggpBusdPool)
      ? new ethers.Contract(deployment.ggpWethPool || deployment.wethGgpPool || deployment.ggpBusdPool, LOCAL_SWAP_POOL_ABI, connection)
      : null,
    wethBtcPool: (deployment.wethBtcPool || deployment.localSwapPool)
      ? new ethers.Contract(deployment.wethBtcPool || deployment.localSwapPool, LOCAL_SWAP_POOL_ABI, connection)
      : null,
    wethUsdcPool: (deployment.wethUsdcPool || deployment.wethBusdPool)
      ? new ethers.Contract(deployment.wethUsdcPool || deployment.wethBusdPool, LOCAL_SWAP_POOL_ABI, connection)
      : null
  };
};

export const getSwapTargetForCurrency = (currency) => {
  const normalized = String(currency || 'ETH').trim().toUpperCase();

  if (normalized === 'GGP') {
    return { symbol: 'GGP', tokenKey: 'ggp', poolKey: 'ggpWethPool' };
  }

  if (normalized === 'BTC' || normalized === 'WBTC') {
    return { symbol: 'BTC', tokenKey: 'btc', poolKey: 'wethBtcPool' };
  }

  if (normalized === 'USDC' || normalized === 'USD' || normalized === 'BUSD') {
    return { symbol: 'USDC', tokenKey: 'usdc', poolKey: 'wethUsdcPool' };
  }

  return { symbol: 'ETH', tokenKey: null, poolKey: null };
};

export const parseEth = (amount) => ethers.parseEther(String(amount));
export const formatEth = (amountWei) => ethers.formatEther(amountWei);
export const formatTokenAmount = (amount, decimals = 18) => ethers.formatUnits(amount, decimals);

export const getTokenDecimals = async (tokenContract) => {
  try {
    return Number(await tokenContract.decimals());
  } catch {
    return 18;
  }
};
