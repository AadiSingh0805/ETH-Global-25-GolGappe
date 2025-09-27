import express from 'express';
import { ethers } from 'ethers';
import User from '../models/User.js';
import { validateEthSignature } from '../middleware/auth.js';

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

    // Find or create user
    let user = await User.findOne({ 'github.id': githubUser.id.toString() });
    
    if (!user) {
      // Check if user exists with same email or username
      user = await User.findOne({
        $or: [
          { email: primaryEmail },
          { username: githubUser.login }
        ]
      });

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
      } else {
        // Create new user
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
    req.session.authMethod = 'github';

    // Redirect to frontend with success
    res.redirect(`${process.env.FRONTEND_URL}/?auth=success`);
    
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

    // Find or create user
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
          nonce: req.session.metamaskNonce
        }
      });
    } else {
      // Update existing user
      user.wallet.isVerified = true;
      user.wallet.nonce = req.session.metamaskNonce;
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
      message: 'Authentication successful',
      user: user.fullProfile
    });
    
  } catch (error) {
    console.error('MetaMask verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
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