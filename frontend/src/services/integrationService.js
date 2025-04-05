import api from './api';

const integrationService = {
  /**
   * Connect Twitter integration
   * @returns {Promise} Promise object with connection status
   */
  connectTwitter: async () => {
    try {
      const response = await api.post('/integrations/twitter/connect');
      return response.data.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to connect Twitter';
    }
  },
  
  /**
   * Disconnect Twitter integration
   * @returns {Promise} Promise object with disconnection status
   */
  disconnectTwitter: async () => {
    try {
      const response = await api.delete('/integrations/twitter/disconnect');
      return response.data.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to disconnect Twitter';
    }
  },
  
  /**
   * Get Twitter connection status
   * @returns {Promise} Promise object with Twitter connection status
   */
  getTwitterStatus: async () => {
    try {
      const response = await api.get('/integrations/twitter/status');
      return response.data.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to get Twitter status';
    }
  },
  
  /**
   * Start Twitter stream for an event
   * @param {string} eventId - Event ID
   * @returns {Promise} Promise object with stream status
   */
  startTwitterStream: async (eventId) => {
    try {
      const response = await api.post(`/integrations/twitter/stream/${eventId}`);
      return response.data.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to start Twitter stream';
    }
  },
  
  /**
   * Stop Twitter stream for an event
   * @param {string} eventId - Event ID
   * @returns {Promise} Promise object with stream status
   */
  stopTwitterStream: async (eventId) => {
    try {
      const response = await api.delete(`/integrations/twitter/stream/${eventId}`);
      return response.data.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to stop Twitter stream';
    }
  },
  
  /**
   * Connect Instagram integration
   * @returns {Promise} Promise object with connection status
   */
  connectInstagram: async () => {
    try {
      const response = await api.post('/integrations/instagram/connect');
      return response.data.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to connect Instagram';
    }
  },
  
  /**
   * Disconnect Instagram integration
   * @returns {Promise} Promise object with disconnection status
   */
  disconnectInstagram: async () => {
    try {
      const response = await api.delete('/integrations/instagram/disconnect');
      return response.data.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to disconnect Instagram';
    }
  },
  
  /**
   * Get Instagram connection status
   * @returns {Promise} Promise object with Instagram connection status
   */
  getInstagramStatus: async () => {
    try {
      const response = await api.get('/integrations/instagram/status');
      return response.data.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to get Instagram status';
    }
  },
  
  /**
   * Configure Instagram hashtags for an event
   * @param {string} eventId - Event ID
   * @param {Array} hashtags - Hashtags to track
   * @returns {Promise} Promise object with configuration status
   */
  configureInstagramHashtags: async (eventId, hashtags) => {
    try {
      const response = await api.post(`/integrations/instagram/hashtags/${eventId}`, { hashtags });
      return response.data.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to configure Instagram hashtags';
    }
  },
  
  /**
   * Connect LinkedIn integration
   * @returns {Promise} Promise object with connection status
   */
  connectLinkedIn: async () => {
    try {
      const response = await api.post('/integrations/linkedin/connect');
      return response.data.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to connect LinkedIn';
    }
  },
  
  /**
   * Disconnect LinkedIn integration
   * @returns {Promise} Promise object with disconnection status
   */
  disconnectLinkedIn: async () => {
    try {
      const response = await api.delete('/integrations/linkedin/disconnect');
      return response.data.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to disconnect LinkedIn';
    }
  },
  
  /**
   * Get LinkedIn connection status
   * @returns {Promise} Promise object with LinkedIn connection status
   */
  getLinkedInStatus: async () => {
    try {
      const response = await api.get('/integrations/linkedin/status');
      return response.data.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to get LinkedIn status';
    }
  },
  
  /**
   * Configure LinkedIn company for an event
   * @param {string} eventId - Event ID
   * @param {string} companyId - LinkedIn company ID
   * @param {string} companyName - LinkedIn company name
   * @returns {Promise} Promise object with configuration status
   */
  configureLinkedInCompany: async (eventId, companyId, companyName) => {
    try {
      const response = await api.post(`/integrations/linkedin/company/${eventId}`, {
        companyId,
        companyName
      });
      return response.data.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to configure LinkedIn company';
    }
  },
  
  /**
   * Get integration settings for an event
   * @param {string} eventId - Event ID
   * @returns {Promise} Promise object with integration settings
   */
  getIntegrationSettings: async (eventId) => {
    try {
      const response = await api.get(`/integrations/settings/${eventId}`);
      return response.data.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to get integration settings';
    }
  },
  
  /**
   * Update integration settings for an event
   * @param {string} eventId - Event ID
   * @param {Object} settings - Updated integration settings
   * @returns {Promise} Promise object with updated integration settings
   */
  updateIntegrationSettings: async (eventId, settings) => {
    try {
      const response = await api.put(`/integrations/settings/${eventId}`, settings);
      return response.data.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to update integration settings';
    }
  },
  
  /**
   * Test an integration
   * @param {string} platform - Platform to test ('twitter', 'instagram', 'linkedin')
   * @param {Object} testParams - Test parameters
   * @returns {Promise} Promise object with test results
   */
  testIntegration: async (platform, testParams = {}) => {
    try {
      const response = await api.post(`/integrations/test/${platform}`, testParams);
      return response.data.data;
    } catch (error) {
      throw error.response?.data?.message || `Failed to test ${platform} integration`;
    }
  }
};

export default integrationService;