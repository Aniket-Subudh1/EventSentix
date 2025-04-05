import api from './api';

const feedbackService = {
  /**
   * Submit new feedback
   * @param {Object} feedbackData - Feedback data
   * @returns {Promise} Promise object with feedback submission status
   */
  submitFeedback: async (feedbackData) => {
    try {
      const response = await api.post('/feedback/submit', feedbackData);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to submit feedback';
    }
  },
  
  /**
   * Get feedback for an event
   * @param {string} eventId - Event ID
   * @param {Object} params - Query parameters (sentiment, source, page, limit, etc.)
   * @returns {Promise} Promise object with feedback data
   */
  getEventFeedback: async (eventId, params = {}) => {
    try {
      const response = await api.get(`/feedback/event/${eventId}`, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch feedback';
    }
  },
  /**
   * Get feedback statistics for an event
   * @param {string} eventId - Event ID
   * @returns {Promise} Promise object with feedback statistics
   */
  getEventFeedbackStats: async (eventId) => {
    try {
      const response = await api.get(`/feedback/event/${eventId}/stats`);
      return response.data.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch feedback statistics';
    }
  },
  
  /**
   * Get sentiment breakdown for an event
   * @param {string} eventId - Event ID
   * @param {Object} params - Query parameters (startDate, endDate, groupBy)
   * @returns {Promise} Promise object with sentiment breakdown data
   */
  getSentimentBreakdown: async (eventId, params = {}) => {
    try {
      const response = await api.get(`/feedback/event/${eventId}/sentiment`, { params });
      return response.data.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch sentiment breakdown';
    }
  },
  
  /**
   * Get issue breakdown for an event
   * @param {string} eventId - Event ID
   * @returns {Promise} Promise object with issue breakdown data
   */
  getIssueBreakdown: async (eventId) => {
    try {
      const response = await api.get(`/feedback/event/${eventId}/issues`);
      return response.data.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch issue breakdown';
    }
  },
  
  /**
   * Get feedback by source for an event
   * @param {string} eventId - Event ID
   * @returns {Promise} Promise object with feedback by source data
   */
  getFeedbackBySource: async (eventId) => {
    try {
      const response = await api.get(`/feedback/event/${eventId}/by-source`);
      return response.data.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch feedback by source';
    }
  },
  
  /**
   * Get feedback by ID
   * @param {string} feedbackId - Feedback ID
   * @returns {Promise} Promise object with feedback data
   */
  getFeedbackById: async (feedbackId) => {
    try {
      const response = await api.get(`/feedback/${feedbackId}`);
      return response.data.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch feedback';
    }
  },
  
  /**
   * Update feedback
   * @param {string} feedbackId - Feedback ID
   * @param {Object} updateData - Updated feedback data
   * @returns {Promise} Promise object with updated feedback data
   */
  updateFeedback: async (feedbackId, updateData) => {
    try {
      const response = await api.put(`/feedback/${feedbackId}`, updateData);
      return response.data.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to update feedback';
    }
  },
  
  /**
   * Delete feedback
   * @param {string} feedbackId - Feedback ID
   * @returns {Promise} Promise object with success message
   */
  deleteFeedback: async (feedbackId) => {
    try {
      await api.delete(`/feedback/${feedbackId}`);
      return true;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to delete feedback';
    }
  },
  
  /**
   * Batch process feedback
   * @param {Array} feedbackIds - Array of feedback IDs
   * @param {Object} updates - Updates to apply to all selected feedback
   * @returns {Promise} Promise object with batch operation result
   */
  batchProcessFeedback: async (feedbackIds, updates) => {
    try {
      const response = await api.post('/feedback/batch-process', {
        feedbackIds,
        updates
      });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to process feedback';
    }
  }
};

export default feedbackService;