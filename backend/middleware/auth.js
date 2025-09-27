import User from '../models/User.js';

// Simple session-based authentication middleware
export const requireAuth = async (req, res, next) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    const user = await User.findById(req.session.userId);
    
    if (!user || !user.isActive) {
      req.session.destroy();
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid session' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Authentication error' 
    });
  }
};

// Optional authentication middleware (doesn't fail if no session)
export const optionalAuth = async (req, res, next) => {
  try {
    if (req.session.userId) {
      const user = await User.findById(req.session.userId);
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Role-based authorization middleware
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }

    next();
  };
};

// Validate Ethereum signature middleware
export const validateEthSignature = (req, res, next) => {
  const { signature, message, address } = req.body;
  
  if (!signature || !message || !address) {
    return res.status(400).json({
      success: false,
      message: 'Signature, message, and address are required'
    });
  }

  // Ethereum address format validation
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid Ethereum address format'
    });
  }

  next();
};