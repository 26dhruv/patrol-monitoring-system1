import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';
import { notifySuccess, notifyError, notifyInfo } from '../utils/notifications';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser && token) {
          setCurrentUser(JSON.parse(storedUser));
          await fetchCurrentUser(); // Verify token is valid and refresh user data
        }
      } catch (err) {
        console.error('Error loading user:', err);
        logout(); // Clear any invalid session
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [token]);

  // Fetch current user data from API
  const fetchCurrentUser = async () => {
    try {
      const response = await authService.getCurrentUser();
      const userData = response.data.data;
      setCurrentUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      return userData;
    } catch (err) {
      console.error('Error fetching current user:', err);
      logout();
      throw err;
    }
  };

  // Login user
  const login = async (email, password) => {
    try {
      setError(null);
      
      // Clear any existing auth data to prevent conflicts
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
      setCurrentUser(null);
      
      console.log('Attempting login with:', { email }); // Debug log
      
      const response = await authService.login({ email, password });
      const { token, user } = response.data;
      
      if (!token || !user) {
        throw new Error('Invalid response from server');
      }
      
      console.log('Login successful for user:', user.role); // Debug log
      
      // Store new auth data
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setToken(token);
      setCurrentUser(user);
      
      notifySuccess(`Welcome, ${user.name}!`);
      
      // Check if there's a return URL to redirect to after login
      const returnUrl = localStorage.getItem('returnUrl');
      if (returnUrl) {
        // Clear the stored URL to prevent future unexpected redirects
        localStorage.removeItem('returnUrl');
        
        // Ensure we're not redirecting to login or other auth pages
        if (!returnUrl.includes('/login') && !returnUrl.includes('/register')) {
          // Use timeout to ensure the context is fully updated before redirect
          setTimeout(() => {
            window.location.href = returnUrl;
          }, 100);
        }
      }
      
      return user;
    } catch (err) {
      console.error('Login error details:', err.response || err);
      const errorMessage = 
        err.response?.data?.message || 
        err.response?.data?.error || 
        err.message ||
        'Failed to login. Please check your credentials.';
      setError(errorMessage);
      notifyError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Register user
  const register = async (userData) => {
    try {
      setError(null);
      const response = await authService.register(userData);
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setToken(token);
      setCurrentUser(user);
      notifySuccess('Registration successful!');
      return user;
    } catch (err) {
      console.error('Registration error:', err);
      const errorMessage = 
        err.response?.data?.error || 
        'Failed to register. Please try again.';
      setError(errorMessage);
      notifyError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setCurrentUser(null);
    try {
      authService.logout();
      notifyInfo('You have been logged out');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Update user profile
  const updateProfile = async (userData) => {
    try {
      if (!currentUser) throw new Error('No user logged in');
      const response = await authService.updateUser(currentUser.id, userData);
      const updatedUser = response.data.data;
      setCurrentUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      notifySuccess('Profile updated successfully!');
      return updatedUser;
    } catch (err) {
      console.error('Update profile error:', err);
      const errorMessage = 
        err.response?.data?.error || 
        'Failed to update profile. Please try again.';
      setError(errorMessage);
      notifyError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Check if user has a specific role
  const hasRole = (roles) => {
    if (!currentUser) return false;
    if (Array.isArray(roles)) {
      return roles.includes(currentUser.role);
    }
    return currentUser.role === roles;
  };

  const value = {
    currentUser,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    hasRole,
    isAuthenticated: !!currentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 