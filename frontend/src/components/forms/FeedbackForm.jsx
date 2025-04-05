import React, { useState, useContext } from 'react';
import { Button } from '../common/Button';
import { Loader } from '../common/Loader';
import { EventContext } from '../../context/EventContext';
import { SocketContext } from '../../context/SocketContext';
import feedbackService from '../../services/feedbackService';
import { MessageCircle, MapPin, Send } from 'react-feather';

const FeedbackForm = ({ onSuccess, className }) => {
  const { selectedEvent } = useContext(EventContext);
  const { submitFeedback, connected } = useContext(SocketContext);
  
  const [formData, setFormData] = useState({
    text: '',
    source: 'direct',
    location: '',
    username: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.text) {
      setError('Please enter your feedback');
      return;
    }
    
    if (!selectedEvent) {
      setError('No event selected');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const feedbackData = {
        ...formData,
        event: selectedEvent.id
      };
      
      // Try to submit using socket if connected
      if (connected) {
        await submitFeedback(feedbackData);
      } else {
        // Fallback to REST API
        await feedbackService.submitFeedback(feedbackData);
      }
      
      // Reset form
      setFormData({
        text: '',
        source: 'direct',
        location: '',
        username: ''
      });
      
      setSuccess(true);
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
      
      // Callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError(err.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className={`p-6 bg-white rounded-lg shadow ${className || ''}`}>
      <div className="flex items-center mb-4">
        <MessageCircle className="text-blue-500 mr-2" size={20} />
        <h3 className="text-lg font-medium">Submit Feedback</h3>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-sm text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-50 text-sm text-green-700 rounded-md">
          Feedback submitted successfully!
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-1">
              Your Feedback
            </label>
            <textarea
              id="text"
              name="text"
              rows="3"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Share your experience..."
              value={formData.text}
              onChange={handleChange}
              required
            ></textarea>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                Location (Optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin size={16} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  id="location"
                  name="location"
                  className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Where in the event?"
                  value={formData.location}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Your Name (Optional)
              </label>
              <input
                type="text"
                id="username"
                name="username"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Your name"
                value={formData.username}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              disabled={loading || !selectedEvent}
              icon={loading ? <Loader size="sm" color="white" /> : <Send size={16} />}
            >
              {loading ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        </div>
      </form>
      
      {!selectedEvent && (
        <div className="mt-4 p-3 bg-yellow-50 text-sm text-yellow-700 rounded-md">
          Please select an event to submit feedback.
        </div>
      )}
    </div>
  );
};

export default FeedbackForm;