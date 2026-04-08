import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();
const TAB_AUTH_KEY = 'tabAuthActive';

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Only rehydrate auth for the current tab if this tab has already authenticated.
    if (sessionStorage.getItem(TAB_AUTH_KEY) === '1') {
      checkAuth().catch(() => {
        setLoading(false);
      });
      return;
    }

    setUser(null);
    setIsAuthenticated(false);
    setLoading(false);
  }, []);

  const markTabAuthenticated = () => {
    sessionStorage.setItem(TAB_AUTH_KEY, '1');
  };

  const clearTabAuthentication = () => {
    sessionStorage.removeItem(TAB_AUTH_KEY);
  };

  const checkAuth = async () => {
    // Manual auth check - can be called after successful login
    setLoading(true);
    try {
      const response = await authService.getCurrentUser();
      
      if (response.success && response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
        markTabAuthenticated();
        console.log('Auth check successful:', response.user);
        return response;
      } else {
        setUser(null);
        setIsAuthenticated(false);
        clearTabAuthentication();
        console.log('Auth check failed: no user data');
        return response;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      clearTabAuthentication();
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  const metamaskLogin = async () => {
    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please connect your MetaMask wallet.');
      }

      const address = accounts[0];

      // Get nonce from backend for signature
      const nonceResponse = await authService.getMetaMaskNonce(address);
      if (!nonceResponse.success) {
        throw new Error(nonceResponse.message || 'Failed to generate nonce');
      }

      const { message } = nonceResponse;

      // Sign message with MetaMask
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, address]
      });

      // Verify signature and authenticate
      const response = await authService.verifyMetaMaskSignature(address, signature, message);
      
      if (response.success && response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
        markTabAuthenticated();
        return response;
      } else {
        throw response;
      }
    } catch (error) {
      console.error('MetaMask login failed:', error);
      throw error;
    }
  };

  const githubLogin = async () => {
    try {
      const response = await authService.githubLogin();

      if (response?.success === false) {
        throw new Error(response.message || 'GitHub OAuth is not configured');
      }
    } catch (error) {
      console.error('GitHub login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      setIsAuthenticated(false);
      clearTabAuthentication();
    } catch (error) {
      console.error('Logout failed:', error);
      // Force local logout even if API call fails
      setUser(null);
      setIsAuthenticated(false);
      clearTabAuthentication();
    }
  };

  const linkWallet = async (address) => {
    try {
      const response = await authService.linkWallet(address);
      
      if (response.success && response.user) {
        setUser(response.user);
        return response;
      } else {
        throw response;
      }
    } catch (error) {
      console.error('Link wallet failed:', error);
      throw error;
    }
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    githubLogin,
    metamaskLogin,
    logout,
    linkWallet,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Export at the bottom in a consistent way
export { useAuth, AuthProvider };