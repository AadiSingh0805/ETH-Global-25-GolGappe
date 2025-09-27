import express from 'express';
import User from '../models/User.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Get user profile
router.get('/profile/:username?', optionalAuth, async (req, res) => {
  try {
    const username = req.params.username || req.user?.username;
    
    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username required'
      });
    }

    const user = await User.findOne({ username });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Return public profile or full profile if it's the user's own profile
    const isOwnProfile = req.user && req.user._id.equals(user._id);
    
    res.json({
      success: true,
      user: isOwnProfile ? user.fullProfile : {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        bio: user.bio,
        role: user.role,
        stats: user.stats,
        isVerified: user.isVerified,
        createdAt: user.createdAt
      }
    });
    
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile'
    });
  }
});

// Update user profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { displayName, bio, preferences } = req.body;
    
    const user = req.user;
    
    if (displayName) {
      user.displayName = displayName.trim().substring(0, 50);
    }
    
    if (bio !== undefined) {
      user.bio = bio.trim().substring(0, 500);
    }
    
    if (preferences) {
      if (preferences.theme && ['light', 'dark', 'auto'].includes(preferences.theme)) {
        user.preferences.theme = preferences.theme;
      }
      
      if (preferences.notifications) {
        if (typeof preferences.notifications.email === 'boolean') {
          user.preferences.notifications.email = preferences.notifications.email;
        }
        if (typeof preferences.notifications.push === 'boolean') {
          user.preferences.notifications.push = preferences.notifications.push;
        }
      }
      
      if (preferences.privacy) {
        if (typeof preferences.privacy.showEmail === 'boolean') {
          user.preferences.privacy.showEmail = preferences.privacy.showEmail;
        }
        if (typeof preferences.privacy.showWallet === 'boolean') {
          user.preferences.privacy.showWallet = preferences.privacy.showWallet;
        }
      }
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: user.fullProfile
    });
    
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// Get user statistics
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    
    res.json({
      success: true,
      stats: {
        ...user.stats,
        accountAge: Math.floor((Date.now() - user.createdAt) / (1000 * 60 * 60 * 24)), // days
        lastLoginAt: user.lastLoginAt,
        hasWallet: !!user.wallet?.address
      }
    });
    
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user statistics'
    });
  }
});

export default router;