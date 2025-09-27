import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const response = await authService.getCurrentUser();
      
      if (response.success && response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const githubLogin = async () => {
    try {
      await authService.githubLogin();
      // Redirect will happen automatically
    } catch (error) {
      console.error('GitHub login failed:', error);
      throw error;
    }
  };

  const metamaskLogin = async () => {
    try {
      const response = await authService.connectMetaMask();
      
      if (response.success && response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
        return response;
      } else {
        throw response;
      }
    } catch (error) {
      console.error('MetaMask login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout failed:', error);
      // Force local logout even if API call fails
      setUser(null);
      setIsAuthenticated(false);
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
};