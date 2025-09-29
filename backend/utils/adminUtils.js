// Admin utilities for the bounty platform

/**
 * Check if a user has admin privileges
 */
export const isAdmin = (user) => {
  // Define admin criteria - you can expand this logic
  const adminUsernames = ['vedaXD', 'admin']; // Add more admin usernames as needed
  const adminGithubIds = []; // Add GitHub IDs if needed
  const adminWalletAddresses = [
    '0x260EcDd9e8bd7254a5d16eA5Dc2a3A56391FBd26'.toLowerCase(), // Your wallet address
    '0x4cAd382572C51bF90a0402E00B7882D25a161ae0'.toLowerCase()  // Another admin address
  ]; // Add wallet addresses if needed
  
  if (!user) {
    return false;
  }
  
  // Check by username
  if (user.username && adminUsernames.includes(user.username)) {
    return true;
  }
  
  // Check by GitHub ID
  if (user.github?.id && adminGithubIds.includes(user.github.id)) {
    return true;
  }
  
  // Check by wallet address
  if (user.wallet?.address && adminWalletAddresses.includes(user.wallet.address.toLowerCase())) {
    return true;
  }
  
  // Check by user ID (if you have specific admin user IDs)
  // if (user._id && adminUserIds.includes(user._id.toString())) {
  //   return true;
  // }
  
  return false;
};

/**
 * Check if a user can create bounties for a repository
 * (either they own the repo or they are admin)
 */
export const canCreateBounty = async (user, repoId) => {
  // If user is admin, they can create bounties for any repo
  if (isAdmin(user)) {
    return { canCreate: true, reason: 'admin' };
  }
  
  // TODO: Add repository ownership check here
  // This would require checking the blockchain to see if the user owns the repo
  
  return { canCreate: true, reason: 'owner' }; // For now, assume they can
};

/**
 * Middleware to check if user has admin privileges
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  
  if (!isAdmin(req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Admin privileges required'
    });
  }
  
  next();
};

/**
 * Get admin status for frontend
 */
export const getAdminStatus = (user) => {
  return {
    isAdmin: isAdmin(user),
    canOverrideBounties: isAdmin(user),
    adminLevel: isAdmin(user) ? 'full' : 'none'
  };
};