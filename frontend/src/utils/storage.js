/**
 * Set an item in local storage with optional JSON serialization
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 * @param {boolean} [serialize=true] - Whether to JSON serialize the value
 */
export const setStorageItem = (key, value, serialize = true) => {
    try {
      const storageValue = serialize ? JSON.stringify(value) : value;
      localStorage.setItem(key, storageValue);
    } catch (error) {
      console.error(`Error setting storage item ${key}:`, error);
    }
  };
  
  /**
   * Get an item from local storage with optional JSON parsing
   * @param {string} key - Storage key
   * @param {boolean} [parse=true] - Whether to JSON parse the value
   * @returns {*} Parsed or raw stored value
   */
  export const getStorageItem = (key, parse = true) => {
    try {
      const value = localStorage.getItem(key);
      return parse && value ? JSON.parse(value) : value;
    } catch (error) {
      console.error(`Error getting storage item ${key}:`, error);
      return null;
    }
  };
  
  /**
   * Remove an item from local storage
   * @param {string} key - Storage key to remove
   */
  export const removeStorageItem = (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing storage item ${key}:`, error);
    }
  };
  
  /**
   * Clear all items from local storage
   */
  export const clearStorage = () => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  };
  
  /**
   * Check if an item exists in local storage
   * @param {string} key - Storage key to check
   * @returns {boolean} Whether the item exists
   */
  export const hasStorageItem = (key) => {
    try {
      return localStorage.getItem(key) !== null;
    } catch (error) {
      console.error(`Error checking storage item ${key}:`, error);
      return false;
    }
  };
  
  /**
   * Store user authentication data
   * @param {Object} userData - User authentication data
   */
  export const storeUserAuth = (userData) => {
    setStorageItem('user', userData);
    setStorageItem('token', userData.token);
  };
  
  /**
   * Remove user authentication data
   */
  export const removeUserAuth = () => {
    removeStorageItem('user');
    removeStorageItem('token');
  };
  
  /**
   * Get current authenticated user
   * @returns {Object|null} User data or null
   */
  export const getCurrentUser = () => {
    return getStorageItem('user');
  };
  
  /**
   * Get authentication token
   * @returns {string|null} Authentication token
   */
  export const getAuthToken = () => {
    return getStorageItem('token', false);
  };
  
  /**
   * Session storage wrapper
   */
  export const sessionStorage = {
    /**
     * Set an item in session storage
     * @param {string} key - Storage key
     * @param {*} value - Value to store
     * @param {boolean} [serialize=true] - Whether to JSON serialize
     */
    setItem: (key, value, serialize = true) => {
      try {
        const storageValue = serialize ? JSON.stringify(value) : value;
        window.sessionStorage.setItem(key, storageValue);
      } catch (error) {
        console.error(`Error setting session storage item ${key}:`, error);
      }
    },
  
    /**
     * Get an item from session storage
     * @param {string} key - Storage key
     * @param {boolean} [parse=true] - Whether to JSON parse
     * @returns {*} Parsed or raw stored value
     */
    getItem: (key, parse = true) => {
      try {
        const value = window.sessionStorage.getItem(key);
        return parse && value ? JSON.parse(value) : value;
      } catch (error) {
        console.error(`Error getting session storage item ${key}:`, error);
        return null;
      }
    },
  
    /**
     * Remove an item from session storage
     * @param {string} key - Storage key to remove
     */
    removeItem: (key) => {
      try {
        window.sessionStorage.removeItem(key);
      } catch (error) {
        console.error(`Error removing session storage item ${key}:`, error);
      }
    },
  
    /**
     * Clear all items from session storage
     */
    clear: () => {
      try {
        window.sessionStorage.clear();
      } catch (error) {
        console.error('Error clearing session storage:', error);
      }
    }
  };