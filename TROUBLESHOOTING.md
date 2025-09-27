# 🚨 Donation Troubleshooting Guide

## ❌ **Your Error Explanation:**

The error `Internal JSON-RPC error` means the Filecoin network rejected your transaction. Here's what's happening:

### **💰 IMPORTANT: You're using tFIL (Test Filecoin), NOT ETH!**

- **Network**: Filecoin Calibration Testnet
- **Currency**: **tFIL** (Test Filecoin)
- **What you need**: Test Filecoin tokens, NOT Ethereum

## 🔧 **How to Fix This:**

### **1. Get Test Filecoin (tFIL)**
You need tFIL tokens to make donations. Here's how to get them:

**Option A: Filecoin Calibration Faucet**
- Go to: https://faucet.calibration.fildev.network/
- Enter your wallet address
- Request test tokens
- Wait 5-10 minutes for tokens to arrive

**Option B: Alternative Faucets**
- https://calibration.fildev.network/
- https://faucet.triangleplatform.com/filecoin/calibration

### **2. Check Your Balance**
1. Open MetaMask
2. Make sure you're on **Filecoin Calibration Testnet**
3. Check your tFIL balance (should be > 0.001 tFIL)

### **3. Network Setup**
Make sure MetaMask is configured for Filecoin:
- **Network Name**: Filecoin Calibration Testnet
- **Chain ID**: 314159
- **RPC URL**: https://api.calibration.node.glif.io/rpc/v1
- **Currency**: tFIL
- **Explorer**: https://calibration.filfox.info/

### **4. Common Issues:**

**❌ "Insufficient tFIL"**
- Solution: Get more test tokens from faucet

**❌ "Wrong Network"**
- Solution: Switch to Filecoin Calibration Testnet in MetaMask

**❌ "Contract Error"**
- Solution: Repository might not be properly listed on blockchain

**❌ "Gas Estimation Failed"**
- Solution: Contract might be paused or repository ID invalid

## ✅ **Step-by-Step Fix:**

1. **Get tFIL tokens** from faucet (link above)
2. **Switch to Filecoin Calibration Testnet** in MetaMask
3. **Verify you have > 0.001 tFIL** balance
4. **Try donation again** with a small amount (0.001 tFIL)

## 🎯 **Test Transaction:**
Try donating just **0.001 tFIL** first to see if it works.

## 📞 **Still Having Issues?**
Check the browser console (F12) for detailed error messages. The improved error handling will now tell you exactly what's wrong!

---
**Remember: This is TEST FILECOIN, not real money! 🧪**