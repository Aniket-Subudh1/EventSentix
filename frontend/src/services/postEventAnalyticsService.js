import api from './api';

const postEventAnalyticsService = {
  /**
   * Check if post-event report is available for an event
   * @param {string} eventId - Event ID
   * @returns {Promise} Promise with report availability data
   */
  checkReportAvailability: async (eventId) => {
    try {
      const response = await api.get(`/analytics/post-event/${eventId}/availability`);
      return response.data.data;
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(error.response?.data?.message || 'Failed to check report availability');
    }
  },

  /**
   * Generate and get full post-event analysis report
   * @param {string} eventId - Event ID
   * @param {boolean} force - Force report generation for active events
   * @returns {Promise} Promise with post-event analysis report
   */
  getPostEventReport: async (eventId, force = false) => {
    try {
      const response = await api.get(`/analytics/post-event/${eventId}`, {
        params: { force }
      });
      return response.data.data;
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(error.response?.data?.message || 'Failed to generate post-event report');
    }
  },

  /**
   * Get event improvement recommendations
   * @param {string} eventId - Event ID
   * @param {boolean} force - Force report generation for active events
   * @returns {Promise} Promise with improvement recommendations
   */
  getImprovementRecommendations: async (eventId, force = false) => {
    try {
      const response = await api.get(`/analytics/post-event/${eventId}/recommendations`, {
        params: { force }
      });
      return response.data.data;
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(error.response?.data?.message || 'Failed to get improvement recommendations');
    }
  },

  /**
   * Get event insights
   * @param {string} eventId - Event ID
   * @param {boolean} force - Force report generation for active events
   * @returns {Promise} Promise with event insights
   */
  getEventInsights: async (eventId, force = false) => {
    try {
      const response = await api.get(`/analytics/post-event/${eventId}/insights`, {
        params: { force }
      });
      return response.data.data;
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(error.response?.data?.message || 'Failed to get event insights');
    }
  },

  /**
   * Export post-event report
   * @param {string} eventId - Event ID
   * @param {string} format - Export format (json, pdf)
   * @param {boolean} force - Force report generation for active events
   * @returns {Promise} Promise with exported report
   */
  exportPostEventReport: async (eventId, format = 'json', force = false) => {
    try {
      const response = await api.get(`/analytics/post-event/${eventId}/export`, {
        params: { format, force },
        responseType: format === 'json' ? 'json' : 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(error.response?.data?.message || 'Failed to export post-event report');
    }
  }
};

export default postEventAnalyticsService;