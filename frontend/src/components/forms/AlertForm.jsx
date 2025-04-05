import React, { useState, useEffect, useContext } from 'react';
import { EventContext } from '../../context/EventContext';
import { Button } from '../common/Button';
import { Loader } from '../common/Loader';
import { AlertTriangle, Bell, MapPin, Info } from 'react-feather';

const AlertForm = ({ alert, onSubmit, onCancel }) => {
  const { selectedEvent } = useContext(EventContext);
  
  const [formData, setFormData] = useState({
    event: '',
    type: 'issue',
    severity: 'medium',
    title: '',
    description: '',
    category: 'general',
    location: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Set event ID from selected event
    if (selectedEvent && !alert) {
      setFormData(prev => ({
        ...prev,
        event: selectedEvent.id
      }));
    }
    
    if (alert) {
      setFormData({
        event: alert.event,
        type: alert.type || 'issue',
        severity: alert.severity || 'medium',
        title: alert.title || '',
        description: alert.description || '',
        category: alert.category || 'general',
        location: alert.location || ''
      });
    }
  }, [alert, selectedEvent]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Form validation
    if (!formData.title || !formData.description) {
      setError('Please fill in all required fields');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      await onSubmit(formData);
    } catch (err) {
      setError(err.message || 'Failed to save alert');
    } finally {
      setLoading(false);
    }
  };
  
  // Alert types
  const alertTypes = [
    { value: 'issue', label: 'Issue', description: 'A specific problem or issue' },
    { value: 'sentiment', label: 'Sentiment', description: 'Based on negative feedback sentiment' },
    { value: 'trend', label: 'Trend', description: 'A detected pattern or trend' },
    { value: 'system', label: 'System', description: 'System-generated alert' }
  ];
  
  // Severity levels
  const severityLevels = [
    { value: 'low', label: 'Low', color: 'bg-blue-100 text-blue-800' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
    { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800' }
  ];
  
  // Categories
  const categories = [
    { value: 'queue', label: 'Queue/Waiting' },
    { value: 'audio', label: 'Audio Issues' },
    { value: 'video', label: 'Video/Display Issues' },
    { value: 'crowding', label: 'Overcrowding' },
    { value: 'amenities', label: 'Amenities' },
    { value: 'content', label: 'Content Issues' },
    { value: 'temperature', label: 'Temperature' },
    { value: 'safety', label: 'Safety Concerns' },
    { value: 'general', label: 'General' },
    { value: 'other', label: 'Other' }
  ];
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 rounded-md bg-red-50 text-sm text-red-700">
          {error}
        </div>
      )}
      
      <div className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Alert Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            name="title"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            value={formData.title}
            onChange={handleChange}
            required
          />
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows="3"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            value={formData.description}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700">
              Alert Type
            </label>
            <select
              id="type"
              name="type"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={formData.type}
              onChange={handleChange}
            >
              {alertTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="severity" className="block text-sm font-medium text-gray-700">
              Severity
            </label>
            <select
              id="severity"
              name="severity"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={formData.severity}
              onChange={handleChange}
            >
              {severityLevels.map(level => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
            
            <div className="mt-2 flex flex-wrap gap-2">
              {severityLevels.map(level => (
                <span
                  key={level.value}
                  className={`px-2 py-1 rounded-full text-xs font-medium ${level.color} ${
                    formData.severity === level.value ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                  }`}
                >
                  {level.label}
                </span>
              ))}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              id="category"
              name="category"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={formData.category}
              onChange={handleChange}
            >
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">
              Location (Optional)
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MapPin className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                id="location"
                name="location"
                className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="e.g., Main Hall, Registration Area"
                value={formData.location}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="rounded-md bg-blue-50 p-4 flex items-start">
        <div className="flex-shrink-0">
          <Info className="h-5 w-5 text-blue-400" aria-hidden="true" />
        </div>
        <div className="ml-3 text-sm text-blue-700">
          <p>
            Creating a manual alert will notify all assigned users based on their notification preferences.
          </p>
        </div>
      </div>
      
      <div className="mt-5 flex justify-end space-x-3">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
        >
          Cancel
        </Button>
        
        <Button
          type="submit"
          variant="primary"
          disabled={loading}
        >
          {loading ? <Loader size="sm" color="white" className="mr-2" /> : <Bell size={16} className="mr-2" />}
          {alert ? 'Update Alert' : 'Create Alert'}
        </Button>
      </div>
    </form>
  );
};

export default AlertForm;