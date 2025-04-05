/**
 * Format date to a readable string
 * @param {Date|string} date - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string
 */
export const formatDate = (date, options = {}) => {
    const defaultOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    return new Intl.DateTimeFormat('en-US', mergedOptions).format(new Date(date));
  };
  
  /**
   * Format currency
   * @param {number} amount - Amount to format
   * @param {string} currency - Currency code (default USD)
   * @returns {string} Formatted currency string
   */
  export const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };
  
  /**
   * Truncate text to specified length
   * @param {string} text - Text to truncate
   * @param {number} maxLength - Maximum length
   * @param {string} suffix - Suffix to add if truncated
   * @returns {string} Truncated text
   */
  export const truncateText = (text, maxLength = 100, suffix = '...') => {
    if (!text) return '';
    
    return text.length > maxLength 
      ? text.substring(0, maxLength) + suffix 
      : text;
  };
  
  /**
   * Format number with commas
   * @param {number} num - Number to format
   * @returns {string} Formatted number
   */
  export const formatNumber = (num) => {
    return num.toLocaleString('en-US');
  };
  
  /**
   * Convert bytes to human-readable format
   * @param {number} bytes - Number of bytes
   * @param {number} decimals - Number of decimal places
   * @returns {string} Formatted file size
   */
  export const formatFileSize = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
  
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
    const i = Math.floor(Math.log(bytes) / Math.log(k));
  
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };
  
  /**
   * Format duration (e.g., for time differences)
   * @param {number} milliseconds - Duration in milliseconds
   * @returns {string} Formatted duration
   */
  export const formatDuration = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
  
    if (days > 0) return `${days} day${days !== 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
    if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  };