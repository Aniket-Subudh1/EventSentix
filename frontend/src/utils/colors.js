/**
 * Convert hex color to RGB
 * @param {string} hex - Hex color code
 * @returns {Object} RGB color object
 */
export const hexToRgb = (hex) => {
    // Remove the hash at the start if it's there
    hex = hex.replace(/^#/, '');
  
    // Handle 3-digit hex
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }
  
    // Parse the hex values
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
  
    return { r, g, b };
  };
  
  /**
   * Convert RGB to hex color
   * @param {number} r - Red value (0-255)
   * @param {number} g - Green value (0-255)
   * @param {number} b - Blue value (0-255)
   * @returns {string} Hex color code
   */
  export const rgbToHex = (r, g, b) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };
  
  /**
   * Generate a random hex color
   * @returns {string} Random hex color code
   */
  export const generateRandomColor = () => {
    return `#${Math.floor(Math.random()*16777215).toString(16)}`;
  };
  
  /**
   * Determine if a color is light or dark
   * @param {string} hex - Hex color code
   * @returns {string} 'light' or 'dark'
   */
  export const getColorBrightness = (hex) => {
    const { r, g, b } = hexToRgb(hex);
    
    // Counting the perceptive luminance
    // Human eye favors green color
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
    return luminance > 0.5 ? 'light' : 'dark';
  };
  
  /**
   * Lighten or darken a color
   * @param {string} hex - Hex color code
   * @param {number} percent - Percentage to lighten/darken (-100 to 100)
   * @returns {string} Modified hex color
   */
  export const adjustColor = (hex, percent) => {
    const { r, g, b } = hexToRgb(hex);
    
    const adjust = (color) => {
      const adjusted = Math.round(color * (1 + percent / 100));
      return Math.min(255, Math.max(0, adjusted));
    };
  
    return rgbToHex(
      adjust(r),
      adjust(g),
      adjust(b)
    );
  };
  
  /**
   * Predefined color palettes
   */
  export const colorPalettes = {
    sentiment: {
      positive: '#10B981', // Green
      neutral: '#9CA3AF', // Gray
      negative: '#EF4444'  // Red
    },
    alertSeverity: {
      critical: '#EF4444', // Red
      high: '#F97316',     // Orange
      medium: '#F59E0B',   // Yellow
      low: '#3B82F6'       // Blue
    },
    sourceColors: {
      twitter: '#1DA1F2',
      instagram: '#E1306C',
      linkedin: '#0A66C2',
      app_chat: '#25D366',
      survey: '#FF6B6B',
      direct: '#4ECDC4'
    }
  };
  
  /**
   * Get color for a specific sentiment
   * @param {string} sentiment - Sentiment type
   * @returns {string} Hex color code
   */
  export const getSentimentColor = (sentiment) => {
    return colorPalettes.sentiment[sentiment] || colorPalettes.sentiment.neutral;
  };
  
  /**
   * Get color for an alert severity
   * @param {string} severity - Alert severity
   * @returns {string} Hex color code
   */
  export const getAlertSeverityColor = (severity) => {
    return colorPalettes.alertSeverity[severity] || colorPalettes.alertSeverity.low;
  };