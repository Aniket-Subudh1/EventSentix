import api from './api';

const chatService = {
  /**
   * Get chat statistics for an event
   * @param {string} eventId - Event ID
   * @returns {Promise} Promise object with chat statistics
   */
  getChatStats: async (eventId) => {
    try {
      const response = await api.get(`/chat/stats/${eventId}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching chat stats:', error);
      throw error.response?.data?.message || 'Failed to fetch chat statistics';
    }
  },

  /**
   * Get chat messages for an event
   * @param {string} eventId - Event ID
   * @param {Object} params - Query parameters (limit, before)
   * @returns {Promise} Promise object with chat messages
   */
  getEventMessages: async (eventId, params = {}) => {
    try {
      const response = await api.get(`/chat/event/${eventId}`, { params });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      throw error.response?.data?.message || 'Failed to fetch chat messages';
    }
  },

  /**
   * Submit a chat message
   * @param {Object} messageData - Message data 
   * @returns {Promise} Promise object with submitted message
   */
  sendMessage: async (messageData) => {
    try {
      const response = await api.post(`/chat/event/${messageData.event}`, messageData);
      return response.data.data;
    } catch (error) {
      console.error('Error sending chat message:', error);
      throw error.response?.data?.message || 'Failed to send message';
    }
  }
};

export default chatService;