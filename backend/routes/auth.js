import express from 'express';
import { ethers } from 'ethers';
import User from '../models/User.js';
import { validateEthSignature } from '../middleware/auth.js';

const router = express.Router();

// MetaMask authentication - generate nonce
router.post('/metamask/nonce', async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        message: 'Valid Ethereum address is required'
      });
    }

    // Generate a random nonce
    const nonce = Math.floor(Math.random() * 1000000).toString();
    
    // Store nonce temporarily in session
    req.session.metamaskNonce = nonce;
    req.session.metamaskAddress = address.toLowerCase();

    res.json({
      success: true,
      nonce: nonce,
      message: `Please sign this message to authenticate with GolGappe:\n\nNonce: ${nonce}\nAddress: ${address}`
    });
    
  } catch (error) {
    console.error('MetaMask nonce error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate nonce'
    });
  }
});

// MetaMask authentication - verify signature
router.post('/metamask/verify', validateEthSignature, async (req, res) => {
  try {
    const { address, signature, message } = req.body;
    
    // Verify the signature
    const recoveredAddress = ethers.verifyMessage(message, signature);
    
    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    // Check nonce from session
    if (!req.session.metamaskNonce || !req.session.metamaskAddress) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session or expired nonce'
      });
    }

    if (req.session.metamaskAddress !== address.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'Address mismatch'
      });
    }

    let user = await User.findOne({ 'wallet.address': address.toLowerCase() });

    if (!user) {
      // Create new user with wallet
      const shortAddress = address.slice(0, 6) + '...' + address.slice(-4);
      user = new User({
        username: `wallet_${address.slice(2, 8)}`,
        displayName: `User ${shortAddress}`,
        wallet: {
          address: address.toLowerCase(),
          isVerified: true,
          nonce: req.session.metamaskNonce,
          lastSignInMessage: message
        }
      });
    } else {
      // Update existing user
      user.wallet.isVerified = true;
      user.wallet.nonce = req.session.metamaskNonce;
      user.wallet.lastSignInMessage = message;
    }

    await user.save();
    await user.updateLastLogin();

    // Set session
    req.session.userId = user._id;
    req.session.authMethod = 'metamask';
    
    // Clear MetaMask session data
    delete req.session.metamaskNonce;
    delete req.session.metamaskAddress;

    res.json({
      success: true,
      message: 'MetaMask connected successfully',
      user: user.fullProfile,
      walletAddress: address.toLowerCase()
    });
    
  } catch (error) {
    console.error('MetaMask verification error:', error);
    res.status(500).json({
      success: false,
      message: 'MetaMask authentication failed'
    });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.json({ 
        success: false, 
        user: null 
      });
    }

    const user = await User.findById(req.session.userId);
    
    if (!user) {
      req.session.destroy();
      return res.json({ 
        success: false, 
        user: null 
      });
    }

    res.json({
      success: true,
      user: user.fullProfile,
      authMethod: req.session.authMethod
    });
    
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user info'
    });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to logout'
      });
    }
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });
});

// Check authentication status
router.get('/status', (req, res) => {
  res.json({
    success: true,
    authenticated: !!req.session.userId,
    authMethod: req.session.authMethod || null
  });
});

export default router;