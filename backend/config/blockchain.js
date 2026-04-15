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
  const contractAddress = process.env.BOUNTY_BOARD_ADDRESS;
  if (!contractAddress) {
    throw new Error('BOUNTY_BOARD_ADDRESS is not configured');
  }

  return new ethers.Contract(
    contractAddress,
    BOUNTY_BOARD_ABI,
    signerOrProvider || getProvider()
  );
};

export const parseEth = (amount) => ethers.parseEther(String(amount));
export const formatEth = (amountWei) => ethers.formatEther(amountWei);
