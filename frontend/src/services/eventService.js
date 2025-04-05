import api from './api';

const eventService = {
  /**
   * Get all events for the current user
   * @param {Object} params - Query parameters (active, page, limit, sort)
   * @returns {Promise} Promise object with events data
   */
  getEvents: async (params = {}) => {
    try {
      // Add a cache-breaking parameter to prevent 304 Not Modified responses
      const uniqueParams = {
        ...params,
        _t: Date.now() // Add timestamp to force server to return fresh data
      };
      
      const response = await api.get('/events', { params: uniqueParams });
      
      // Add a console log to help debug response structure
      console.log('API response for events:', response.data);
      
      // Ensure we're returning the correct data structure
      return {
        ...response.data,
        data: Array.isArray(response.data.data) ? response.data.data : []
      };
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error.response?.data?.message || 'Failed to fetch events';
    }
  },
  
  /**
   * Get a specific event by ID
   * @param {string} eventId - Event ID
   * @returns {Promise} Promise object with event data
   */
  getEvent: async (eventId) => {
    try {
      const response = await api.get(`/events/${eventId}`);
      return response.data.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch event';
    }
  },
  
  /**
   * Create a new event
   * @param {Object} eventData - Event data
   * @returns {Promise} Promise object with created event data
   */
  createEvent: async (eventData) => {
    try {
      const response = await api.post('/events', eventData);
      return response.data.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to create event';
    }
  },
  
  /**
   * Update an existing event
   * @param {string} eventId - Event ID
   * @param {Object} eventData - Updated event data
   * @returns {Promise} Promise object with updated event data
   */
  updateEvent: async (eventId, eventData) => {
    try {
      const response = await api.put(`/events/${eventId}`, eventData);
      return response.data.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to update event';
    }
  },
  
  /**
   * Delete an event
   * @param {string} eventId - Event ID
   * @returns {Promise} Promise object with success message
   */
  deleteEvent: async (eventId) => {
    try {
      await api.delete(`/events/${eventId}`);
      return true;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to delete event';
    }
  },
  
  /**
   * Add an organizer to an event
   * @param {string} eventId - Event ID
   * @param {string} email - Organizer email
   * @returns {Promise} Promise object with updated event data
   */
  addOrganizer: async (eventId, email) => {
    try {
      const response = await api.post(`/events/${eventId}/organizers`, { email });
      return response.data.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to add organizer';
    }
  },
  
  /**
   * Remove an organizer from an event
   * @param {string} eventId - Event ID
   * @param {string} organizerId - Organizer user ID
   * @returns {Promise} Promise object with updated event data
   */
  removeOrganizer: async (eventId, organizerId) => {
    try {
      const response = await api.delete(`/events/${eventId}/organizers/${organizerId}`);
      return response.data.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to remove organizer';
    }
  },
  
  /**
   * Update social tracking settings
   * @param {string} eventId - Event ID
   * @param {Object} trackingData - Social tracking settings
   * @returns {Promise} Promise object with updated event data
   */
  updateSocialTracking: async (eventId, trackingData) => {
    try {
      const response = await api.put(
        `/events/${eventId}/social-tracking`, 
        trackingData
      );
      return response.data.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to update social tracking';
    }
  },
  
  /**
   * Update alert settings
   * @param {string} eventId - Event ID
   * @param {Object} alertSettings - Alert settings
   * @returns {Promise} Promise object with updated event data
   */
  updateAlertSettings: async (eventId, alertSettings) => {
    try {
      const response = await api.put(
        `/events/${eventId}/alert-settings`, 
        alertSettings
      );
      return response.data.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to update alert settings';
    }
  },
  
  /**
   * Get location map for an event
   * @param {string} eventId - Event ID
   * @returns {Promise} Promise object with location map data
   */
  getLocationMap: async (eventId) => {
    try {
      const response = await api.get(`/events/${eventId}/location-map`);
      return response.data.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch location map';
    }
  },
  
  /**
   * Update location map for an event
   * @param {string} eventId - Event ID
   * @param {Object} mapData - Location map data
   * @returns {Promise} Promise object with updated location map data
   */
  updateLocationMap: async (eventId, mapData) => {
    try {
      const response = await api.put(
        `/events/${eventId}/location-map`, 
        mapData
      );
      return response.data.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to update location map';
    }
  },
  
  /**
   * Toggle event active status
   * @param {string} eventId - Event ID
   * @returns {Promise} Promise object with updated event status
   */
  toggleEventActive: async (eventId) => {
    try {
      const response = await api.put(`/events/${eventId}/toggle-active`);
      return response.data.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to toggle event status';
    }
  }
};

export default eventService;