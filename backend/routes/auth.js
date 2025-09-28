import express from 'express';
import { ethers } from 'ethers';
import User from '../models/User.js';
import { validateEthSignature } from '../middleware/auth.js';
import { getAdminStatus } from '../utils/adminUtils.js';

const router = express.Router();

// GitHub OAuth login
router.get('/github', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = process.env.GITHUB_CALLBACK_URL;
  const scope = 'user:email';
  
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`;
  
  res.json({ 
    success: true, 
    authUrl: githubAuthUrl 
  });
});

// GitHub OAuth callback
router.get('/github/callback', async (req, res) => {
  try {
    const { code, error } = req.query;
    
    if (error) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth?error=${error}`);
    }
    
    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth?error=no_code`);
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth?error=${tokenData.error}`);
    }

    // Get user info from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    const githubUser = await userResponse.json();
    
    // Get user emails
    const emailResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    const emails = await emailResponse.json();
    const primaryEmail = emails.find(email => email.primary)?.email || githubUser.email;

    // Find or create user - prioritize existing MetaMask user
    let user = await User.findOne({ 'github.id': githubUser.id.toString() });
    
    if (!user) {
      // Check if user exists with same email or username, or if there's an existing session with wallet
      const existingQuery = {
        $or: [
          { email: primaryEmail },
          { username: githubUser.login }
        ]
      };

      // If there's a session with wallet, prioritize linking to that user
      if (req.session.userId) {
        const sessionUser = await User.findById(req.session.userId);
        if (sessionUser && sessionUser.wallet?.address) {
          user = sessionUser;
        }
      }

      if (!user) {
        user = await User.findOne(existingQuery);
      }

      if (user) {
        // Update existing user with GitHub info
        user.github = {
          id: githubUser.id.toString(),
          username: githubUser.login,
          email: primaryEmail,
          avatar: githubUser.avatar_url,
          profileUrl: githubUser.html_url,
          accessToken: tokenData.access_token
        };
        
        // If user doesn't have basic info, update from GitHub
        if (!user.displayName) {
          user.displayName = githubUser.name || githubUser.login;
        }
        if (!user.bio) {
          user.bio = githubUser.bio || '';
        }
        if (!user.avatar && !user.wallet?.address) {
          user.avatar = githubUser.avatar_url;
        }
      } else {
        // Create new user - but they should have connected MetaMask first
        user = new User({
          username: githubUser.login,
          displayName: githubUser.name || githubUser.login,
          email: primaryEmail,
          avatar: githubUser.avatar_url,
          bio: githubUser.bio || '',
          github: {
            id: githubUser.id.toString(),
            username: githubUser.login,
            email: primaryEmail,
            avatar: githubUser.avatar_url,
            profileUrl: githubUser.html_url,
            accessToken: tokenData.access_token
          }
        });
      }
    } else {
      // Update existing GitHub user
      user.github.accessToken = tokenData.access_token;
      user.github.avatar = githubUser.avatar_url;
      user.displayName = githubUser.name || user.displayName;
      user.bio = githubUser.bio || user.bio;
    }

    await user.save();
    await user.updateLastLogin();

    // Set session
    req.session.userId = user._id;
    req.session.authMethod = user.wallet?.address ? 'both' : 'github';

    // Check if user has both MetaMask and GitHub connected
    const hasBothConnections = user.wallet?.address && user.github?.id;
    
    if (hasBothConnections) {
      // Both connections complete - redirect to role selection
      res.redirect(`${process.env.FRONTEND_URL}/role-selection`);
    } else {
      // Only GitHub connected - redirect back to auth page for MetaMask
      res.redirect(`${process.env.FRONTEND_URL}/auth?auth=github_success`);
    }
    
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/auth?error=oauth_failed`);
  }
});

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

    let user;

    // Check if user is already logged in (GitHub first, then MetaMask)
    if (req.session.userId) {
      // User is already authenticated, link wallet to existing account
      user = await User.findById(req.session.userId);
      
      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if wallet is already linked to another account
      const existingWalletUser = await User.findOne({ 'wallet.address': address.toLowerCase() });
      if (existingWalletUser && !existingWalletUser._id.equals(user._id)) {
        return res.status(400).json({
          success: false,
          message: 'This wallet is already linked to another account'
        });
      }

      // Link wallet to existing user
      user.wallet = {
        address: address.toLowerCase(),
        isVerified: true,
        nonce: req.session.metamaskNonce,
        lastSignInMessage: message
      };
    } else {
      // No existing session, find or create user with wallet
      user = await User.findOne({ 'wallet.address': address.toLowerCase() });
      
      if (user) {
        // User exists with this wallet - log them in (returning user)
        console.log(`Existing user found for wallet ${address.toLowerCase()}, logging them in`);
        user.wallet.isVerified = true;
        user.wallet.nonce = req.session.metamaskNonce;
        user.wallet.lastSignInMessage = message;
      } else {
        // Create new user with wallet (first time user)
        console.log(`Creating new user for wallet ${address.toLowerCase()}`);
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
      }
    }

    await user.save();
    await user.updateLastLogin();

    // Set/update session
    req.session.userId = user._id;
    req.session.authMethod = req.session.authMethod ? 'both' : 'metamask';
    
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
      user: {
        ...user.fullProfile,
        ...getAdminStatus(user) // Add admin status
      },
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