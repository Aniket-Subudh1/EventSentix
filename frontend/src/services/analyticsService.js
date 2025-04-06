import api from './api';

const analyticsService = {
  
  /**
 * Check if post-event report is available for an event
 * @param {string} eventId - Event ID
 * @returns {Promise} Promise with report availability data
 */
checkPostEventReportAvailability: async (eventId) => {
  try {
    const response = await api.get(`/analytics/post-event/${eventId}/availability`);
    return response.data.data;
  } catch (error) {
    console.error('API Error:', error);
    throw new Error(error.response?.data?.message || 'Failed to check report availability');
  }
},/**
* Generate a post-event analysis report
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
getEventRecommendations: async (eventId, force = false) => {
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
   * Get sentiment trend data for an event
   * @param {string} eventId - Event ID
   * @param {string} timeframe - Time grouping ('minute', 'hour', 'day')
   * @param {number} limit - Number of data points to return
   * @returns {Promise} Promise object with sentiment trend data
   */
  getSentimentTrend: async (eventId, timeframe = 'hour', limit = 24) => {
    try {
      const response = await api.get(`/analytics/sentiment/trend/${eventId}`, {
        params: { timeframe, limit }
      });
      return response.data.data;
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch sentiment trend');
    }
  },
  
  /**
   * Get sentiment overview data for an event
   * @param {string} eventId - Event ID
   * @param {Object} params - Query parameters (startTime, endTime)
   * @returns {Promise} Promise object with sentiment overview data
   */
  getSentimentOverview: async (eventId, params = {}) => {
    try {
      const response = await api.get(`/analytics/sentiment/overview/${eventId}`, { params });
      return response.data.data;
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch sentiment overview');
    }
  },
  
  /**
   * Get issue trend data for an event
   * @param {string} eventId - Event ID
   * @param {string} timeframe - Time grouping ('minute', 'hour', 'day')
   * @param {number} limit - Number of data points to return
   * @returns {Promise} Promise object with issue trend data
   */
  getIssueTrend: async (eventId, timeframe = 'hour', limit = 24) => {
    try {
      const response = await api.get(`/analytics/issues/trend/${eventId}`, {
        params: { timeframe, limit }
      });
      return response.data.data;
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch issue trend');
    }
  },
  
  /**
   * Get feedback source distribution for an event
   * @param {string} eventId - Event ID
   * @param {Object} params - Query parameters (startTime, endTime)
   * @returns {Promise} Promise object with source distribution data
   */
  getSourceDistribution: async (eventId, params = {}) => {
    try {
      const response = await api.get(`/analytics/sources/${eventId}`, { params });
      return response.data.data;
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch source distribution');
    }
  },
  
  /**
   * Get trending topics for an event
   * @param {string} eventId - Event ID
   * @param {Object} params - Query parameters (timeWindow, minMentions, maxTopics)
   * @returns {Promise} Promise object with trending topics data
   */
  getTrendingTopics: async (eventId, params = {}) => {
    try {
      const response = await api.get(`/analytics/trending/${eventId}`, { params });
      return response.data.data;
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch trending topics');
    }
  },
  
  /**
   * Get location heatmap data for an event
   * @param {string} eventId - Event ID
   * @returns {Promise} Promise object with location heatmap data
   */
  getLocationHeatmap: async (eventId) => {
    try {
      const response = await api.get(`/analytics/location/${eventId}`);
      return response.data.data;
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch location heatmap');
    }
  },
  
  /**
   * Get alert history for an event
   * @param {string} eventId - Event ID
   * @param {Object} params - Query parameters (startTime, endTime)
   * @returns {Promise} Promise object with alert history data
   */
  getAlertHistory: async (eventId, params = {}) => {
    try {
      const response = await api.get(`/analytics/alerts/history/${eventId}`, { params });
      return response.data.data;
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch alert history');
    }
  },
  
  /**
   * Get event summary data
   * @param {string} eventId - Event ID
   * @returns {Promise} Promise object with event summary data
   */
  getEventSummary: async (eventId) => {
    try {
      const response = await api.get(`/analytics/summary/${eventId}`);
      return response.data.data;
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch event summary');
    }
  },
  
  /**
   * Get dashboard data for an event
   * @param {string} eventId - Event ID
   * @returns {Promise} Promise object with dashboard data
   */
  getDashboardData: async (eventId) => {
    if (!eventId) {
      throw new Error('Event ID is required');
    }
    
    try {
      const response = await api.get(`/analytics/dashboard/${eventId}`);
      // Add validation to ensure data exists
      if (!response.data || !response.data.data) {
        throw new Error('Invalid response format from API');
      }
      return response.data.data;
    } catch (error) {
      // Enhanced error logging
      console.error('Dashboard data fetch error:', error);
      if (error.response) {
        console.error('API response:', error.response.status, error.response.data);
      }
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch dashboard data');
    }
  },
  
  /**
   * Get feedback volume data for an event
   * @param {string} eventId - Event ID
   * @param {Object} params - Query parameters (groupBy, startTime, endTime)
   * @returns {Promise} Promise object with feedback volume data
   */
  getFeedbackVolume: async (eventId, params = {}) => {
    try {
      const response = await api.get(`/analytics/volume/${eventId}`, { params });
      return response.data.data;
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch feedback volume');
    }
  },
  
  /**
   * Get issue resolution statistics for an event
   * @param {string} eventId - Event ID
   * @returns {Promise} Promise object with resolution statistics data
   */
  getResolutionStats: async (eventId) => {
    try {
      const response = await api.get(`/analytics/resolution/${eventId}`);
      return response.data.data;
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch resolution statistics');
    }
  },
  
  /**
   * Export analytics data for an event
   * @param {string} eventId - Event ID
   * @param {Object} params - Query parameters (format, includeAll)
   * @returns {Promise} Promise object with exported data
   */
  exportAnalyticsData: async (eventId, params = {}) => {
    try {
      const response = await api.get(`/analytics/export/${eventId}`, { 
        params,
        responseType: params.format === 'csv' ? 'blob' : 'json'
      });
      return response.data;
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(error.response?.data?.message || 'Failed to export analytics data');
    }
  },
  
  /**
   * Get word cloud data for an event
   * @param {string} eventId - Event ID
   * @param {Object} params - Query parameters (sentiment, limit, startTime, endTime)
   * @returns {Promise} Promise object with word cloud data
   */
  getWordCloudData: async (eventId, params = {}) => {
    try {
      const response = await api.get(`/analytics/wordcloud/${eventId}`, { params });
      return response.data.data;
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch word cloud data');
    }
  }
};

export default analyticsService;