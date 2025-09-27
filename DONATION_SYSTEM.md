# MetaMask Donation System

## Overview
The donation system now uses **MetaMask directly** instead of backend APIs that require private keys. This is much more secure and user-friendly.

## How It Works

### 1. **Frontend Web3 Integration**
- Uses `ethers.js` in the browser to interact with MetaMask
- Direct blockchain transactions without exposing private keys
- Automatic network switching to Filecoin Calibration Testnet

### 2. **Smart Contract Integration**
- **Contract Address**: `0xE865690eCAc3547dA4e87e648F7Fbb10778C6050`
- **Function**: `donateToProject(uint256 _repoId) payable`
- **Network**: Filecoin Calibration Testnet (Chain ID: 314159)

### 3. **User Experience**
1. User clicks "Donate" button on listed repository
2. Modal opens with donation amount input
3. User enters amount (minimum 0.001 ETH)
4. MetaMask popup appears for transaction approval
5. Transaction is submitted to blockchain
6. Success message shows transaction hash
7. Project pool balance updates automatically

## Technical Implementation

### Web3Service (`src/services/web3Service.js`)
```javascript
// Main functions:
- donateToProject(repoId, amountInEth) // Send ETH to project pool
- getProjectPool(repoId)              // Get current pool balance
- connectWallet()                     // Connect to MetaMask
- ensureCorrectNetwork()              // Switch to Filecoin network
```

### Frontend Changes
- **CreatorDashboard.jsx**: Updated to use Web3Service instead of escrowAPI
- **RepoCard.jsx**: Added donate button and modal with error handling
- **CSS**: Added styles for donate button and modal

## Security Benefits
✅ **No Private Keys Required** - Uses MetaMask's secure signing
✅ **User Controls Transaction** - User sees and approves each transaction
✅ **Network Validation** - Ensures correct blockchain network
✅ **Gas Estimation** - MetaMask handles gas fees automatically

## Error Handling
- Network switching prompts
- Insufficient funds detection
- User transaction rejection handling
- Invalid input validation

## Usage
1. Ensure MetaMask is installed and connected
2. Have test ETH on Filecoin Calibration Testnet
3. Repository must be already listed on blockchain
4. Click donate button and follow MetaMask prompts

## Network Information
- **Network Name**: Filecoin Calibration Testnet
- **Chain ID**: 314159 (0x4cb2f in hex)
- **RPC URL**: https://api.calibration.node.glif.io/rpc/v1
- **Explorer**: https://calibration.filfox.info/
- **Currency**: tFIL (Test Filecoin)

This system is now fully decentralized and secure! 🚀