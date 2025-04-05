// src/services/twitterService.js
import api from './api';

const twitterService = {
  searchTweets: async (eventId, query) => {
    console.log('Searching Twitter with:', { eventId, query });
    const response = await api.post('/integrations/twitter/search', {
      eventId,
      query
    });
    console.log('Twitter search response:', response.data);
    return response.data;
  }
};

export default twitterService;