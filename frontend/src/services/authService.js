import api from './api';

const authService = {
  /**
   * Authenticate user and get token
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise} Promise object with user data and token
   */
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        
        // Fetch user data
        const userData = await authService.getCurrentUser();
        return userData;
      }
      
      return null;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to login';
    }
  },
  
  /**
   * Register a new user
   * @param {Object} userData - User data including name, email, password
   * @returns {Promise} Promise object with user data and token
   */
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        
        // Fetch user data
        const userData = await authService.getCurrentUser();
        return userData;
      }
      
      return null;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to register';
    }
  },
  
  /**
   * Get current logged in user data
   * @returns {Promise} Promise object with user data
   */
  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me');
      
      if (response.data.data) {
        localStorage.setItem('user', JSON.stringify(response.data.data));
        return response.data.data;
      }
      
      return null;
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return null;
    }
  },
  
  /**
   * Logout user
   */
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Also make API call to log out server-side
    try {
      api.get('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
  },
  
  /**
   * Update user profile
   * @param {Object} userData - Updated user data
   * @returns {Promise} Promise object with updated user data
   */
  updateProfile: async (userData) => {
    try {
      const response = await api.put('/auth/update-details', userData);
      
      if (response.data.data) {
        localStorage.setItem('user', JSON.stringify(response.data.data));
        return response.data.data;
      }
      
      return null;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to update profile';
    }
  },
  
  /**
   * Update user password
   * @param {Object} passwordData - Current and new password
   * @returns {Promise} Promise object with success message
   */
  updatePassword: async (passwordData) => {
    try {
      await api.put('/auth/update-password', passwordData);
      return true;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to update password';
    }
  },
  
  /**
   * Send password reset email
   * @param {string} email - User email
   * @returns {Promise} Promise object with success message
   */
  requestPasswordReset: async (email) => {
    try {
      await api.post('/auth/forgot-password', { email });
      return true;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to send reset email';
    }
  },
  
  /**
   * Reset password with token
   * @param {string} token - Reset token
   * @param {string} password - New password
   * @returns {Promise} Promise object with success message
   */
  resetPassword: async (token, password) => {
    try {
      await api.put(`/auth/reset-password/${token}`, { password });
      return true;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to reset password';
    }
  },
  
  /**
   * Update user alert preferences
   * @param {Object} preferences - Alert preference settings
   * @returns {Promise} Promise object with updated preferences
   */
  updateAlertPreferences: async (preferences) => {
    try {
      const response = await api.put('/auth/alert-preferences', { alertPreferences: preferences });
      return response.data.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to update alert preferences';
    }
  },
  
  /**
   * Check if user is authenticated
   * @returns {boolean} True if authenticated, false otherwise
   */
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  }
};

export default authService;