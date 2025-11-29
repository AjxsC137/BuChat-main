import React, { createContext, useContext, useState, useEffect } from 'react';
import { userService } from '../services/userService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // Save user to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  const login = async (username, password) => {
    try {
      const response = await userService.login({ username, password });
      const userData = response.user;
      const token = response.token;
      
      setUser(userData);
      if (token) localStorage.setItem('token', token);
      
      return userData;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('Invalid username or password');
      }
      if (error.response?.status === 403) {
        const errorData = error.response?.data;
        throw new Error(errorData?.message || 'Please verify your email before logging in');
      }
      throw new Error('Login failed. Please try again.');
    }
  };

  const register = async (userData) => {
    try {
      const response = await userService.register(userData);
      const newUser = response.user;
      const token = response.token;
      
      setUser(newUser);
      if (token) localStorage.setItem('token', token);
      
      return { user: newUser, message: response.message };
    } catch (error) {
      if (error.response?.status === 409) {
        throw new Error('Username or email already exists');
      }
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to register. Please try again.');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const updateUser = async (updates) => {
    if (!user) return;
    try {
      await userService.updateUserProfile(user.username, { ...updates, userId: user.userId });
      const response = await userService.getUserProfile(user.username);
      const updatedUser = response.user;
      setUser(updatedUser);
      return updatedUser;
    } catch (error) {
      throw new Error('Failed to update user');
    }
  };

  const googleAuth = async (idToken) => {
    try {
      const response = await userService.googleAuth(idToken);
      const userData = response.user;
      const token = response.token;
      
      setUser(userData);
      if (token) localStorage.setItem('token', token);
      
      return userData;
    } catch (error) {
      throw new Error('Google Sign-In failed');
    }
  };

  const refreshUser = async () => {
    if (!user) return;
    try {
      const response = await userService.getUserProfile(user.username);
      const updatedUser = response.user;
      setUser(updatedUser);
      return updatedUser;
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    googleAuth,
    logout,
    updateUser,
    refreshUser,
    setUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
