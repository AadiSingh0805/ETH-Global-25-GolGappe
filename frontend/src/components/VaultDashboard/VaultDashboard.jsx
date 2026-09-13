import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './VaultDashboard.css';

// ABIs for MockUSDC and StudentVault
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function transfer(address to, uint256 value) returns (bool)",
  "function mint(address to, uint256 amount)"
];

const VAULT_ABI = [
  "function asset() view returns (address)",
  "function totalAssets() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function convertToShares(uint256 assets) view returns (uint256)",
  "function convertToAssets(uint256 shares) view returns (uint256)",
  "function previewDeposit(uint256 assets) view returns (uint256)",
  "function previewMint(uint256 shares) view returns (uint256)",
  "function previewWithdraw(uint256 assets) view returns (uint256)",
  "function previewRedeem(uint256 shares) view returns (uint256)",
  "function maxDeposit(address receiver) view returns (uint256)",
  "function maxMint(address receiver) view returns (uint256)",
  "function maxWithdraw(address owner) view returns (uint256)",
  "function maxRedeem(address owner) view returns (uint256)",
  "function deposit(uint256 assets, address receiver) returns (uint256)",
  "function mint(uint256 shares, address receiver) returns (uint256)",
  "function withdraw(uint256 assets, address receiver, address owner) returns (uint256)",
  "function redeem(uint256 shares, address receiver, address owner) returns (uint256)",
  "function totalYieldHarvested() view returns (uint256)",
  "function harvestYield(uint256 yieldAmount)",
  "function getVaultDetails() view returns (address, uint256, uint256, uint256)",
  "event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)",
  "event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares)",
  "event YieldHarvested(address indexed harvester, uint256 yieldAmount, uint256 newTotalAssets)"
];

const VaultDashboard = () => {
  const [account, setAccount] = useState('');
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);

  // Contract Addresses & State
  const [vaultAddress, setVaultAddress] = useState('');
  const [usdcAddress, setUsdcAddress] = useState('');

  // Balances & Accounting Metrics
  const [usdcBalance, setUsdcBalance] = useState('0');
  const [vaultShareBalance, setVaultShareBalance] = useState('0');
  const [vaultTotalAssets, setVaultTotalAssets] = useState('0');
  const [vaultTotalShares, setVaultTotalShares] = useState('0');
  const [vaultAllowance, setVaultAllowance] = useState('0');
  const [totalYieldHarvested, setTotalYieldHarvested] = useState('0');
  const [shareExchangeRate, setShareExchangeRate] = useState('1.0000');

  // Input states
  const [mintAmount, setMintAmount] = useState('1000');
  const [approveAmount, setApproveAmount] = useState('500');
  const [depositAmount, setDepositAmount] = useState('100');
  const [mintSharesAmount, setMintSharesAmount] = useState('100');
  const [withdrawAmount, setWithdrawAmount] = useState('50');
  const [redeemSharesAmount, setRedeemSharesAmount] = useState('50');
  const [yieldHarvestAmount, setYieldHarvestAmount] = useState('200');

  // Conversion Preview states
  const [calcAssetsInput, setCalcAssetsInput] = useState('100');
  const [calcSharesOutput, setCalcSharesOutput] = useState('0');
  const [calcSharesInput, setCalcSharesInput] = useState('100');
  const [calcAssetsOutput, setCalcAssetsOutput] = useState('0');

  // Active Tab
  const [activeTab, setActiveTab] = useState('overview');

  // Logs & Notification State
  const [logs, setLogs] = useState([]);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  // Add Log Entry
  const addLog = (step, title, details, txHash = null) => {
    const entry = {
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      step,
      title,
      details,
      txHash
    };
    setLogs((prev) => [entry, ...prev]);
  };

  // Auto connect wallet or fallback to JSON-RPC provider
  useEffect(() => {
    initBlockchain();
  }, []);

  const initBlockchain = async () => {
    try {
      // 1. Fetch deployment json from backend API or local static fallback
      let deploymentData = null;
      try {
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
        const res = await fetch(`${apiBase}/repos/deployments`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.deployment) {
            deploymentData = data.deployment;
          }
        }
      } catch (err) {
        console.warn('Backend deployments fetch failed, checking fallback...', err);
      }

      // Hardhat standard fallback addresses matching current deployment
      const vAddress = deploymentData?.bountyVault || deploymentData?.studentVault || '0xc6e7DF5E7b4f2A278906862b61205850344D4e7d';
      const uAddress = deploymentData?.mockUSDC || deploymentData?.usdc || '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9';

      setVaultAddress(vAddress);
      setUsdcAddress(uAddress);

      if (window.ethereum) {
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        setProvider(browserProvider);
        const accounts = await browserProvider.send("eth_accounts", []);
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          const currentSigner = await browserProvider.getSigner();
          setSigner(currentSigner);
          await loadVaultState(currentSigner, vAddress, uAddress, accounts[0]);
        } else {
          // Read-only setup
          await loadVaultState(browserProvider, vAddress, uAddress, null);
        }
      } else {
        // Fallback to local hardhat RPC
        const jsonRpcProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        setProvider(jsonRpcProvider);
        await loadVaultState(jsonRpcProvider, vAddress, uAddress, null);
      }
    } catch (err) {
      console.error("Initialization error:", err);
      setStatusMsg({ text: `Failed to connect blockchain: ${err.message}`, type: 'error' });
    }
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert('MetaMask or Web3 wallet is required.');
        return;
      }
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send("eth_requestAccounts", []);
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        const currentSigner = await browserProvider.getSigner();
        setSigner(currentSigner);
        setProvider(browserProvider);
        await loadVaultState(currentSigner, vaultAddress, usdcAddress, accounts[0]);
        setStatusMsg({ text: `Wallet connected: ${accounts[0].substring(0,6)}...${accounts[0].slice(-4)}`, type: 'success' });
      }
    } catch (err) {
      setStatusMsg({ text: `Wallet connection error: ${err.message}`, type: 'error' });
    }
  };

  const loadVaultState = async (provOrSigner, vAddr, uAddr, userAddr) => {
    try {
      if (!vAddr || !uAddr) return;

      const usdcContract = new ethers.Contract(uAddr, ERC20_ABI, provOrSigner);
      const vaultContract = new ethers.Contract(vAddr, VAULT_ABI, provOrSigner);

      const [totAssets, totShares, totHarvested] = await Promise.all([
        vaultContract.totalAssets(),
        vaultContract.totalSupply(),
        vaultContract.totalYieldHarvested()
      ]);

      const formattedAssets = ethers.formatUnits(totAssets, 6);
      const formattedShares = ethers.formatUnits(totShares, 6);
      const formattedHarvested = ethers.formatUnits(totHarvested, 6);

      setVaultTotalAssets(formattedAssets);
      setVaultTotalShares(formattedShares);
      setTotalYieldHarvested(formattedHarvested);

      // Exchange rate calc (Assets per 1 Share)
      if (parseFloat(formattedShares) > 0) {
        const rate = (parseFloat(formattedAssets) / parseFloat(formattedShares)).toFixed(4);
        setShareExchangeRate(rate);
      } else {
        setShareExchangeRate('1.0000');
      }

      // User specific balances
      if (userAddr) {
        const [uBal, vBal, allow] = await Promise.all([
          usdcContract.balanceOf(userAddr),
          vaultContract.balanceOf(userAddr),
          usdcContract.allowance(userAddr, vAddr)
        ]);
        setUsdcBalance(ethers.formatUnits(uBal, 6));
        setVaultShareBalance(ethers.formatUnits(vBal, 6));
        setVaultAllowance(ethers.formatUnits(allow, 6));
      }
    } catch (err) {
      console.error("Error loading vault state:", err);
    }
  };

  const refreshState = async () => {
    if (provider && vaultAddress && usdcAddress) {
      await loadVaultState(signer || provider, vaultAddress, usdcAddress, account);
    }
  };

  // -------------------------------------------------------------
  // EXPERIMENT 3 UI ACTIONS
  // -------------------------------------------------------------

  // Step 3: Mint Test Assets (MockUSDC)
  const handleMintUSDC = async () => {
    if (!signer) return alert('Please connect wallet first.');
    try {
      setLoading(true);
      setStatusMsg({ text: 'Minting MockUSDC...', type: 'info' });
      const usdcContract = new ethers.Contract(usdcAddress, ERC20_ABI, signer);
      const parsedAmount = ethers.parseUnits(mintAmount, 6);
      
      const tx = await usdcContract.mint(account, parsedAmount);
      await tx.wait();

      setStatusMsg({ text: `Successfully minted ${mintAmount} MockUSDC!`, type: 'success' });
      addLog('Step 3', 'Mint MockUSDC', `Minted ${mintAmount} USDC to ${account.substring(0, 8)}...`, tx.hash);
      await refreshState();
    } catch (err) {
      console.error(err);
      setStatusMsg({ text: `Mint failed: ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Step 7: Approve Vault
  const handleApproveVault = async () => {
    if (!signer) return alert('Please connect wallet first.');
    try {
      setLoading(true);
      setStatusMsg({ text: 'Approving StudentVault...', type: 'info' });
      const usdcContract = new ethers.Contract(usdcAddress, ERC20_ABI, signer);
      const parsedAmount = ethers.parseUnits(approveAmount, 6);

      const tx = await usdcContract.approve(vaultAddress, parsedAmount);
      await tx.wait();

      setStatusMsg({ text: `Successfully approved ${approveAmount} USDC for Vault!`, type: 'success' });
      addLog('Step 7', 'Approve Vault', `Approved ${approveAmount} USDC for StudentVault (${vaultAddress.substring(0,8)}...)`, tx.hash);
      await refreshState();
    } catch (err) {
      console.error(err);
      setStatusMsg({ text: `Approval failed: ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Step 9: Deposit Assets
  const handleDeposit = async () => {
    if (!signer) return alert('Please connect wallet first.');
    try {
      setLoading(true);
      setStatusMsg({ text: 'Depositing assets into StudentVault...', type: 'info' });
      const vaultContract = new ethers.Contract(vaultAddress, VAULT_ABI, signer);
      const parsedAmount = ethers.parseUnits(depositAmount, 6);

      // Preview deposit
      const previewShares = await vaultContract.previewDeposit(parsedAmount);
      const expectedSharesFormatted = ethers.formatUnits(previewShares, 6);

      const tx = await vaultContract.deposit(parsedAmount, account);
      await tx.wait();

      setStatusMsg({ text: `Deposited ${depositAmount} USDC. Received ~${expectedSharesFormatted} vUSDC shares!`, type: 'success' });
      addLog('Step 9', 'Deposit Assets', `Deposited ${depositAmount} USDC -> Received ${expectedSharesFormatted} vUSDC shares`, tx.hash);
      await refreshState();
    } catch (err) {
      console.error(err);
      setStatusMsg({ text: `Deposit failed: ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Step 12: Mint Shares
  const handleMintShares = async () => {
    if (!signer) return alert('Please connect wallet first.');
    try {
      setLoading(true);
      setStatusMsg({ text: 'Minting exact vault shares...', type: 'info' });
      const vaultContract = new ethers.Contract(vaultAddress, VAULT_ABI, signer);
      const parsedShares = ethers.parseUnits(mintSharesAmount, 6);

      const tx = await vaultContract.mint(parsedShares, account);
      await tx.wait();

      setStatusMsg({ text: `Successfully minted ${mintSharesAmount} vUSDC shares!`, type: 'success' });
      addLog('Step 12', 'Mint Shares', `Minted ${mintSharesAmount} vUSDC shares directly to ${account.substring(0,8)}...`, tx.hash);
      await refreshState();
    } catch (err) {
      console.error(err);
      setStatusMsg({ text: `Mint shares failed: ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Step 13: Withdraw Assets
  const handleWithdraw = async () => {
    if (!signer) return alert('Please connect wallet first.');
    try {
      setLoading(true);
      setStatusMsg({ text: 'Withdrawing underlying assets...', type: 'info' });
      const vaultContract = new ethers.Contract(vaultAddress, VAULT_ABI, signer);
      const parsedAssets = ethers.parseUnits(withdrawAmount || '0', 6);

      const maxWithdrawable = await vaultContract.maxWithdraw(account);
      if (parsedAssets > maxWithdrawable) {
        const maxFormatted = ethers.formatUnits(maxWithdrawable, 6);
        throw new Error(`Cannot withdraw ${withdrawAmount} USDC: Exceeds your max withdrawable balance (${maxFormatted} USDC). Please deposit assets or mint shares first.`);
      }

      const tx = await vaultContract.withdraw(parsedAssets, account, account);
      await tx.wait();

      setStatusMsg({ text: `Successfully withdrew ${withdrawAmount} USDC!`, type: 'success' });
      addLog('Step 13', 'Withdraw Assets', `Withdrew ${withdrawAmount} USDC from Vault to receiver ${account.substring(0,8)}...`, tx.hash);
      await refreshState();
    } catch (err) {
      console.error(err);
      let msg = err.message;
      if (err.data && String(err.data).includes('fe9cceec')) {
        msg = 'Exceeded maximum withdrawable assets. You can only withdraw assets up to the amount backed by your vUSDC shares.';
      }
      setStatusMsg({ text: `Withdraw failed: ${msg}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Step 14: Redeem Shares
  const handleRedeem = async () => {
    if (!signer) return alert('Please connect wallet first.');
    try {
      setLoading(true);
      setStatusMsg({ text: 'Redeeming vUSDC vault shares...', type: 'info' });
      const vaultContract = new ethers.Contract(vaultAddress, VAULT_ABI, signer);
      const parsedShares = ethers.parseUnits(redeemSharesAmount || '0', 6);

      const maxRedeemable = await vaultContract.maxRedeem(account);
      if (parsedShares > maxRedeemable) {
        const maxFormatted = ethers.formatUnits(maxRedeemable, 6);
        throw new Error(`Cannot redeem ${redeemSharesAmount} vUSDC: Exceeds your share balance (${maxFormatted} vUSDC).`);
      }

      const tx = await vaultContract.redeem(parsedShares, account, account);
      await tx.wait();

      setStatusMsg({ text: `Successfully redeemed ${redeemSharesAmount} vUSDC shares!`, type: 'success' });
      addLog('Step 14', 'Redeem Shares', `Redeemed ${redeemSharesAmount} vUSDC shares -> Received USDC back to ${account.substring(0,8)}...`, tx.hash);
      await refreshState();
    } catch (err) {
      console.error(err);
      setStatusMsg({ text: `Redeem failed: ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Step 16: Demonstrate Custom Application Feature - Harvest Yield
  const handleHarvestYield = async () => {
    if (!signer) return alert('Please connect wallet first.');
    try {
      setLoading(true);
      setStatusMsg({ text: 'Harvesting & injecting yield into StudentVault...', type: 'info' });
      const usdcContract = new ethers.Contract(usdcAddress, ERC20_ABI, signer);
      const vaultContract = new ethers.Contract(vaultAddress, VAULT_ABI, signer);
      const parsedYield = ethers.parseUnits(yieldHarvestAmount, 6);

      // Check allowance & approve if needed
      const currentAllow = await usdcContract.allowance(account, vaultAddress);
      if (currentAllow < parsedYield) {
        setStatusMsg({ text: 'Approving yield tokens...', type: 'info' });
        const appTx = await usdcContract.approve(vaultAddress, parsedYield);
        await appTx.wait();
      }

      const tx = await vaultContract.harvestYield(parsedYield);
      await tx.wait();

      setStatusMsg({ text: `Harvested ${yieldHarvestAmount} USDC yield into Vault! Share exchange rate appreciated!`, type: 'success' });
      addLog('Step 16', 'Harvest Yield (Custom Feature)', `Injected ${yieldHarvestAmount} USDC yield into vault without issuing shares. Total Assets boosted!`, tx.hash);
      await refreshState();
    } catch (err) {
      console.error(err);
      setStatusMsg({ text: `Harvest yield failed: ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Step 11: Test Conversion
  const handleCalcConvertToShares = async () => {
    try {
      const activeProv = provider || new ethers.JsonRpcProvider("http://127.0.0.1:8545");
      const vaultContract = new ethers.Contract(vaultAddress, VAULT_ABI, activeProv);
      const shares = await vaultContract.convertToShares(ethers.parseUnits(calcAssetsInput || '0', 6));
      setCalcSharesOutput(ethers.formatUnits(shares, 6));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCalcConvertToAssets = async () => {
    try {
      const activeProv = provider || new ethers.JsonRpcProvider("http://127.0.0.1:8545");
      const vaultContract = new ethers.Contract(vaultAddress, VAULT_ABI, activeProv);
      const assets = await vaultContract.convertToAssets(ethers.parseUnits(calcSharesInput || '0', 6));
      setCalcAssetsOutput(ethers.formatUnits(assets, 6));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="vault-container">
      {/* Header Banner */}
      <div className="vault-header">
        <div className="header-info">
          <div className="vault-badge">EXPERIMENT 3 • GITBOUNTYS VAULT</div>
          <h1 className="vault-title">GitBountys Developer Bounty Vault</h1>
          <p className="vault-subtitle">
            ERC-4626 Tokenized Vault contract for open-source developer rewards. Demonstrates underlying ERC-20 asset (MockUSDC) to vault share (vUSDC) lifecycle accounting and sponsor yield/bonus injection.
          </p>
        </div>
        <div className="wallet-status">
          {account ? (
            <div className="connected-pill">
              <span className="dot online"></span>
              <span>{account.substring(0, 6)}...{account.slice(-4)}</span>
            </div>
          ) : (
            <button className="connect-btn" onClick={connectWallet}>
              Connect Wallet
            </button>
          )}
        </div>
      </div>

      {statusMsg.text && (
        <div className={`status-banner ${statusMsg.type}`}>
          {statusMsg.text}
        </div>
      )}

      {/* Metric Cards Section */}
      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-label">Vault Exchange Rate</span>
          <div className="metric-value green">
            1 vUSDC = {shareExchangeRate} USDC
          </div>
          <span className="metric-sub">Standard ERC-4626 ratio</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Total Vault Assets</span>
          <div className="metric-value">
            {vaultTotalAssets} <span className="unit">USDC</span>
          </div>
          <span className="metric-sub">totalAssets() on-chain</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Total Vault Shares</span>
          <div className="metric-value">
            {vaultTotalShares} <span className="unit">vUSDC</span>
          </div>
          <span className="metric-sub">totalSupply() of shares</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Yield Harvested</span>
          <div className="metric-value amber">
            {totalYieldHarvested} <span className="unit">USDC</span>
          </div>
          <span className="metric-sub">Custom yield feature</span>
        </div>
      </div>

      {/* User Balances Bar */}
      <div className="user-balances-card">
        <h3 className="section-heading">Your Wallet Balances</h3>
        <div className="balances-row">
          <div className="balance-item">
            <span className="label">MockUSDC Balance:</span>
            <span className="value bold">{usdcBalance} USDC</span>
          </div>
          <div className="balance-item">
            <span className="label">Vault Share Balance:</span>
            <span className="value bold green-text">{vaultShareBalance} vUSDC</span>
          </div>
          <div className="balance-item">
            <span className="label">Vault Allowance:</span>
            <span className="value">{vaultAllowance} USDC</span>
          </div>
          <button className="refresh-btn" onClick={refreshState} disabled={loading}>
            Refresh Balances
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="vault-tabs">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          1. Mint & Approve
        </button>
        <button 
          className={`tab-btn ${activeTab === 'deposit' ? 'active' : ''}`}
          onClick={() => setActiveTab('deposit')}
        >
          2. Deposit & Mint Shares
        </button>
        <button 
          className={`tab-btn ${activeTab === 'withdraw' ? 'active' : ''}`}
          onClick={() => setActiveTab('withdraw')}
        >
          3. Withdraw & Redeem
        </button>
        <button 
          className={`tab-btn ${activeTab === 'yield' ? 'active' : ''}`}
          onClick={() => setActiveTab('yield')}
        >
          4. Custom Yield Harvest
        </button>
        <button 
          className={`tab-btn ${activeTab === 'calculator' ? 'active' : ''}`}
          onClick={() => setActiveTab('calculator')}
        >
          5. Conversion Tools
        </button>
      </div>

      {/* TAB CONTENT PANELS */}
      <div className="tab-content">

        {/* TAB 1: MINT & APPROVE */}
        {activeTab === 'overview' && (
          <div className="panel-grid">
            <div className="action-card">
              <div className="step-tag">Step 3</div>
              <h2>Mint Test Underlying Assets</h2>
              <p className="card-desc">
                Mint MockUSDC ERC-20 tokens directly to your connected wallet for laboratory testing.
              </p>
              <div className="form-group">
                <label>Amount to Mint (USDC):</label>
                <input 
                  type="number" 
                  value={mintAmount} 
                  onChange={(e) => setMintAmount(e.target.value)}
                  className="solid-input"
                />
              </div>
              <button 
                className="action-btn primary"
                onClick={handleMintUSDC}
                disabled={loading || !account}
              >
                {loading ? 'Processing...' : `Mint ${mintAmount} MockUSDC`}
              </button>
            </div>

            <div className="action-card">
              <div className="step-tag">Step 7</div>
              <h2>Approve Vault Allowance</h2>
              <p className="card-desc">
                Grant StudentVault contract permission to transfer MockUSDC from your wallet prior to deposit.
              </p>
              <div className="form-group">
                <label>Allowance Amount (USDC):</label>
                <input 
                  type="number" 
                  value={approveAmount} 
                  onChange={(e) => setApproveAmount(e.target.value)}
                  className="solid-input"
                />
              </div>
              <button 
                className="action-btn outline"
                onClick={handleApproveVault}
                disabled={loading || !account}
              >
                {loading ? 'Processing...' : `Approve ${approveAmount} USDC`}
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: DEPOSIT & MINT SHARES */}
        {activeTab === 'deposit' && (
          <div className="panel-grid">
            <div className="action-card">
              <div className="step-tag">Step 8 & 9</div>
              <h2>Deposit Assets (deposit)</h2>
              <p className="card-desc">
                Transfer underlying USDC into the vault and receive corresponding ERC-4626 vUSDC vault shares.
              </p>
              <div className="form-group">
                <label>Assets to Deposit (USDC):</label>
                <input 
                  type="number" 
                  value={depositAmount} 
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="solid-input"
                />
              </div>
              <div className="preview-box">
                <span>Estimated Shares Received:</span>
                <strong>~{(parseFloat(depositAmount || 0) / parseFloat(shareExchangeRate || 1)).toFixed(4)} vUSDC</strong>
              </div>
              <button 
                className="action-btn primary"
                onClick={handleDeposit}
                disabled={loading || !account}
              >
                {loading ? 'Processing...' : `Deposit ${depositAmount} USDC`}
              </button>
            </div>

            <div className="action-card">
              <div className="step-tag">Step 12</div>
              <h2>Mint Specific Shares (mint)</h2>
              <p className="card-desc">
                Specify exact vault shares (vUSDC) to mint, transferring the exact required underlying USDC asset.
              </p>
              <div className="form-group">
                <label>Vault Shares to Mint (vUSDC):</label>
                <input 
                  type="number" 
                  value={mintSharesAmount} 
                  onChange={(e) => setMintSharesAmount(e.target.value)}
                  className="solid-input"
                />
              </div>
              <div className="preview-box">
                <span>Required Assets:</span>
                <strong>~{(parseFloat(mintSharesAmount || 0) * parseFloat(shareExchangeRate || 1)).toFixed(4)} USDC</strong>
              </div>
              <button 
                className="action-btn outline"
                onClick={handleMintShares}
                disabled={loading || !account}
              >
                {loading ? 'Processing...' : `Mint ${mintSharesAmount} vUSDC`}
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: WITHDRAW & REDEEM */}
        {activeTab === 'withdraw' && (
          <div className="panel-grid">
            <div className="action-card">
              <div className="step-tag">Step 13</div>
              <h2>Withdraw Assets (withdraw)</h2>
              <p className="card-desc">
                Request a specific amount of underlying USDC asset; vault burns required vUSDC shares.
              </p>
              <div className="form-group">
                <label>Underlying Assets to Withdraw (USDC):</label>
                <input 
                  type="number" 
                  value={withdrawAmount} 
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="solid-input"
                />
              </div>
              <button 
                className="action-btn primary"
                onClick={handleWithdraw}
                disabled={loading || !account}
              >
                {loading ? 'Processing...' : `Withdraw ${withdrawAmount} USDC`}
              </button>
            </div>

            <div className="action-card">
              <div className="step-tag">Step 14</div>
              <h2>Redeem Shares (redeem)</h2>
              <p className="card-desc">
                Burn a specific quantity of vUSDC vault shares to receive underlying USDC assets back.
              </p>
              <div className="form-group">
                <label>Vault Shares to Redeem (vUSDC):</label>
                <input 
                  type="number" 
                  value={redeemSharesAmount} 
                  onChange={(e) => setRedeemSharesAmount(e.target.value)}
                  className="solid-input"
                />
              </div>
              <button 
                className="action-btn outline"
                onClick={handleRedeem}
                disabled={loading || !account}
              >
                {loading ? 'Processing...' : `Redeem ${redeemSharesAmount} vUSDC`}
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: CUSTOM YIELD HARVEST */}
        {activeTab === 'yield' && (
          <div className="action-card full-width">
            <div className="step-tag custom">Step 16 • Application-Specific Feature</div>
            <h2>Harvest & Inject Strategy Yield (harvestYield)</h2>
            <p className="card-desc">
              Demonstrates custom vault logic: injects USDC assets directly into `totalAssets()` without issuing new shares.
              This increases the underlying backing per share, boosting `convertToAssets()` exchange rate for all existing depositors!
            </p>
            <div className="form-group max-width-form">
              <label>Yield Amount to Harvest/Inject (USDC):</label>
              <input 
                type="number" 
                value={yieldHarvestAmount} 
                onChange={(e) => setYieldHarvestAmount(e.target.value)}
                className="solid-input"
              />
            </div>
            <div className="yield-impact-box">
              <div className="impact-item">
                <span>Current Total Assets:</span>
                <strong>{vaultTotalAssets} USDC</strong>
              </div>
              <div className="impact-item">
                <span>Post-Harvest Total Assets:</span>
                <strong className="green-text">
                  {(parseFloat(vaultTotalAssets || 0) + parseFloat(yieldHarvestAmount || 0)).toFixed(2)} USDC
                </strong>
              </div>
              <div className="impact-item">
                <span>Estimated New Exchange Rate:</span>
                <strong className="green-text">
                  1 vUSDC = {
                    parseFloat(vaultTotalShares) > 0 
                      ? ((parseFloat(vaultTotalAssets || 0) + parseFloat(yieldHarvestAmount || 0)) / parseFloat(vaultTotalShares)).toFixed(4)
                      : '1.0000'
                  } USDC
                </strong>
              </div>
            </div>
            <button 
              className="action-btn primary yield-btn"
              onClick={handleHarvestYield}
              disabled={loading || !account}
            >
              {loading ? 'Processing...' : `Harvest & Inject ${yieldHarvestAmount} USDC Yield`}
            </button>
          </div>
        )}

        {/* TAB 5: CONVERSION TOOLS */}
        {activeTab === 'calculator' && (
          <div className="panel-grid">
            <div className="action-card">
              <div className="step-tag">Step 11</div>
              <h2>convertToShares(assets)</h2>
              <p className="card-desc">Calculate share output for a given underlying asset input.</p>
              <div className="form-group">
                <label>Input Assets (USDC):</label>
                <input 
                  type="number" 
                  value={calcAssetsInput}
                  onChange={(e) => setCalcAssetsInput(e.target.value)}
                  className="solid-input"
                />
              </div>
              <button className="action-btn outline" onClick={handleCalcConvertToShares}>
                Query convertToShares()
              </button>
              <div className="calc-result">
                <span>Result:</span> <strong>{calcSharesOutput} vUSDC</strong>
              </div>
            </div>

            <div className="action-card">
              <div className="step-tag">Step 11</div>
              <h2>convertToAssets(shares)</h2>
              <p className="card-desc">Calculate underlying asset value for a given share quantity.</p>
              <div className="form-group">
                <label>Input Shares (vUSDC):</label>
                <input 
                  type="number" 
                  value={calcSharesInput}
                  onChange={(e) => setCalcSharesInput(e.target.value)}
                  className="solid-input"
                />
              </div>
              <button className="action-btn outline" onClick={handleCalcConvertToAssets}>
                Query convertToAssets()
              </button>
              <div className="calc-result">
                <span>Result:</span> <strong>{calcAssetsOutput} USDC</strong>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Contract Addresses Footer Info */}
      <div className="contract-addresses-box">
        <div className="addr-item">
          <span className="addr-label">StudentVault Address:</span>
          <code className="addr-code">{vaultAddress || 'Loading...'}</code>
        </div>
        <div className="addr-item">
          <span className="addr-label">MockUSDC Asset Address:</span>
          <code className="addr-code">{usdcAddress || 'Loading...'}</code>
        </div>
      </div>

      {/* Transaction & Activity Audit Log */}
      <div className="audit-log-card">
        <h3 className="section-heading">Experiment Activity & Event Log</h3>
        {logs.length === 0 ? (
          <div className="empty-log">No transactions executed yet. Perform actions above to record logs.</div>
        ) : (
          <div className="log-list">
            {logs.map((log) => (
              <div key={log.id} className="log-item">
                <div className="log-badge">{log.step}</div>
                <div className="log-details">
                  <div className="log-header">
                    <span className="log-title">{log.title}</span>
                    <span className="log-time">{log.time}</span>
                  </div>
                  <p className="log-desc">{log.details}</p>
                  {log.txHash && (
                    <span className="log-hash">Tx: <code>{log.txHash}</code></span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VaultDashboard;
