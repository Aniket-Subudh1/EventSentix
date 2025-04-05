import React, { useState, useEffect } from 'react';
import { Button } from '../common/Button';
import { Loader } from '../common/Loader';
import { Calendar, MapPin, Clock, Info } from 'react-feather';

const EventForm = ({ event, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    startDate: '',
    endDate: '',
    socialTracking: {
      hashtags: [],
      mentions: [],
      keywords: []
    },
    locationMap: {
      areas: []
    },
    alertSettings: {
      negativeSentimentThreshold: -0.5,
      issueAlertThreshold: 3,
      autoResolveTime: 60
    }
  });
  
  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hashtagInput, setHashtagInput] = useState('');
  const [mentionInput, setMentionInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [areaInput, setAreaInput] = useState({ name: '', description: '', keywords: '' });
  
  useEffect(() => {
    if (event) {
      // Format dates for input
      const startDate = event.startDate ? new Date(event.startDate) : '';
      const endDate = event.endDate ? new Date(event.endDate) : '';
      
      setFormData({
        name: event.name || '',
        description: event.description || '',
        location: event.location || '',
        startDate: startDate ? startDate.toISOString().split('T')[0] : '',
        endDate: endDate ? endDate.toISOString().split('T')[0] : '',
        socialTracking: {
          hashtags: event.socialTracking?.hashtags || [],
          mentions: event.socialTracking?.mentions || [],
          keywords: event.socialTracking?.keywords || []
        },
        locationMap: {
          areas: event.locationMap?.areas || []
        },
        alertSettings: {
          negativeSentimentThreshold: event.alertSettings?.negativeSentimentThreshold || -0.5,
          issueAlertThreshold: event.alertSettings?.issueAlertThreshold || 3,
          autoResolveTime: event.alertSettings?.autoResolveTime || 60
        }
      });
    }
  }, [event]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle nested properties
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.description || !formData.location || !formData.startDate || !formData.endDate) {
      setError('Please fill in all required fields');
      return;
    }
    
    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      setError('End date must be after start date');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      await onSubmit(formData);
    } catch (err) {
      setError(err.message || 'Failed to save event');
    } finally {
      setLoading(false);
    }
  };
  
  const addHashtag = () => {
    if (!hashtagInput) return;
    const formatted = hashtagInput.startsWith('#') ? hashtagInput : `#${hashtagInput}`;
    if (!formData.socialTracking.hashtags.includes(formatted)) {
      setFormData({
        ...formData,
        socialTracking: {
          ...formData.socialTracking,
          hashtags: [...formData.socialTracking.hashtags, formatted]
        }
      });
    }
    setHashtagInput('');
  };
  
  const removeHashtag = (tag) => {
    setFormData({
      ...formData,
      socialTracking: {
        ...formData.socialTracking,
        hashtags: formData.socialTracking.hashtags.filter(t => t !== tag)
      }
    });
  };
  
  const addMention = () => {
    if (!mentionInput) return;
    if (!formData.socialTracking.mentions.includes(mentionInput)) {
      setFormData({
        ...formData,
        socialTracking: {
          ...formData.socialTracking,
          mentions: [...formData.socialTracking.mentions, mentionInput]
        }
      });
    }
    setMentionInput('');
  };
  
  const removeMention = (mention) => {
    setFormData({
      ...formData,
      socialTracking: {
        ...formData.socialTracking,
        mentions: formData.socialTracking.mentions.filter(m => m !== mention)
      }
    });
  };
  
  const addKeyword = () => {
    if (!keywordInput) return;
    if (!formData.socialTracking.keywords.includes(keywordInput)) {
      setFormData({
        ...formData,
        socialTracking: {
          ...formData.socialTracking,
          keywords: [...formData.socialTracking.keywords, keywordInput]
        }
      });
    }
    setKeywordInput('');
  };
  
  const removeKeyword = (keyword) => {
    setFormData({
      ...formData,
      socialTracking: {
        ...formData.socialTracking,
        keywords: formData.socialTracking.keywords.filter(k => k !== keyword)
      }
    });
  };
  
  const addArea = () => {
    if (!areaInput.name) return;
    
    const newArea = {
      name: areaInput.name,
      description: areaInput.description,
      keywords: areaInput.keywords.split(',').map(k => k.trim()).filter(Boolean)
    };
    
    setFormData({
      ...formData,
      locationMap: {
        ...formData.locationMap,
        areas: [...formData.locationMap.areas, newArea]
      }
    });
    
    setAreaInput({ name: '', description: '', keywords: '' });
  };
  
  const removeArea = (index) => {
    const updatedAreas = [...formData.locationMap.areas];
    updatedAreas.splice(index, 1);
    
    setFormData({
      ...formData,
      locationMap: {
        ...formData.locationMap,
        areas: updatedAreas
      }
    });
  };
  
  const handleAreaInputChange = (e) => {
    const { name, value } = e.target;
    setAreaInput({
      ...areaInput,
      [name]: value
    });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      
      <div className="mb-4 border-b">
        <div className="flex space-x-4">
          <button
            type="button"
            className={`px-4 py-2 border-b-2 ${activeTab === 'basic' ? 'border-blue-500 text-blue-600' : 'border-transparent'}`}
            onClick={() => setActiveTab('basic')}
          >
            Basic Info
          </button>
          <button
            type="button"
            className={`px-4 py-2 border-b-2 ${activeTab === 'social' ? 'border-blue-500 text-blue-600' : 'border-transparent'}`}
            onClick={() => setActiveTab('social')}
          >
            Social Tracking
          </button>
          <button
            type="button"
            className={`px-4 py-2 border-b-2 ${activeTab === 'location' ? 'border-blue-500 text-blue-600' : 'border-transparent'}`}
            onClick={() => setActiveTab('location')}
          >
            Locations
          </button>
          <button
            type="button"
            className={`px-4 py-2 border-b-2 ${activeTab === 'alerts' ? 'border-blue-500 text-blue-600' : 'border-transparent'}`}
            onClick={() => setActiveTab('alerts')}
          >
            Alert Settings
          </button>
        </div>
      </div>
      
      {activeTab === 'basic' && (
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Event Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description *
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
          
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">
              Location *
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MapPin className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                id="location"
                name="location"
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                placeholder="Event venue or address"
                value={formData.location}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                Start Date *
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                End Date *
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                  value={formData.endDate}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'social' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Social Media Tracking</h3>
            <p className="mt-1 text-sm text-gray-500">
              Define what content to track from social media platforms.
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hashtags
            </label>
            <div className="flex">
              <input
                type="text"
                className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md rounded-r-none"
                placeholder="Add hashtag (e.g., #EventName)"
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addHashtag())}
              />
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={addHashtag}
              >
                Add
              </button>
            </div>
            
            <div className="mt-2 flex flex-wrap gap-2">
              {formData.socialTracking.hashtags.map((tag, index) => (
                <span 
                  key={index}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {tag}
                  <button
                    type="button"
                    className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-500"
                    onClick={() => removeHashtag(tag)}
                  >
                    <span className="sr-only">Remove</span>
                    &times;
                  </button>
                </span>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mentions
            </label>
            <div className="flex">
              <input
                type="text"
                className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md rounded-r-none"
                placeholder="Add mention (e.g., CompanyName)"
                value={mentionInput}
                onChange={(e) => setMentionInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMention())}
              />
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={addMention}
              >
                Add
              </button>
            </div>
            
            <div className="mt-2 flex flex-wrap gap-2">
              {formData.socialTracking.mentions.map((mention, index) => (
                <span 
                  key={index}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                >
                  {mention}
                  <button
                    type="button"
                    className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full text-purple-400 hover:bg-purple-200 hover:text-purple-500"
                    onClick={() => removeMention(mention)}
                  >
                    <span className="sr-only">Remove</span>
                    &times;
                  </button>
                </span>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Keywords
            </label>
            <div className="flex">
              <input
                type="text"
                className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md rounded-r-none"
                placeholder="Add keyword (e.g., conference)"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
              />
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={addKeyword}
              >
                Add
              </button>
            </div>
            
            <div className="mt-2 flex flex-wrap gap-2">
              {formData.socialTracking.keywords.map((keyword, index) => (
                <span 
                  key={index}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                >
                  {keyword}
                  <button
                    type="button"
                    className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full text-green-400 hover:bg-green-200 hover:text-green-500"
                    onClick={() => removeKeyword(keyword)}
                  >
                    <span className="sr-only">Remove</span>
                    &times;
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'location' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Location Mapping</h3>
            <p className="mt-1 text-sm text-gray-500">
              Define areas within your event venue for more precise issue tracking.
            </p>
          </div>
          
          <div className="p-4 border rounded-md bg-gray-50">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Add Location Area</h4>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="areaName" className="block text-xs font-medium text-gray-700">
                  Area Name
                </label>
                <input
                  type="text"
                  id="areaName"
                  name="name"
                  className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="e.g., Main Hall, Registration Desk"
                  value={areaInput.name}
                  onChange={handleAreaInputChange}
                />
              </div>
              
              <div>
                <label htmlFor="areaKeywords" className="block text-xs font-medium text-gray-700">
                  Keywords (comma separated)
                </label>
                <input
                  type="text"
                  id="areaKeywords"
                  name="keywords"
                  className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="hall, stage, main"
                  value={areaInput.keywords}
                  onChange={handleAreaInputChange}
                />
              </div>
            </div>
            
            <div className="mt-2">
              <label htmlFor="areaDescription" className="block text-xs font-medium text-gray-700">
                Description (Optional)
              </label>
              <input
                type="text"
                id="areaDescription"
                name="description"
                className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="Brief description of this area"
                value={areaInput.description}
                onChange={handleAreaInputChange}
              />
            </div>
            
            <div className="mt-3">
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={addArea}
              >
                Add Area
              </button>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Defined Areas</h4>
            
            {formData.locationMap.areas.length === 0 ? (
              <p className="text-sm text-gray-500">No areas defined yet. Add areas above.</p>
            ) : (
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Area Name</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Description</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Keywords</th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {formData.locationMap.areas.map((area, index) => (
                      <tr key={index}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{area.name}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{area.description || '-'}</td>
                        <td className="px-3 py-4 text-sm text-gray-500">
                          <div className="flex flex-wrap gap-1">
                            {area.keywords.map((keyword, kidx) => (
                              <span 
                                key={kidx}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button
                            type="button"
                            className="text-red-600 hover:text-red-900"
                            onClick={() => removeArea(index)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      
      {activeTab === 'alerts' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Alert Settings</h3>
            <p className="mt-1 text-sm text-gray-500">
              Configure when alerts should be triggered for this event.
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="negativeSentimentThreshold" className="block text-sm font-medium text-gray-700">
                Negative Sentiment Threshold
              </label>
              <div className="mt-1 flex items-center">
                <input
                  type="range"
                  id="negativeSentimentThreshold"
                  name="alertSettings.negativeSentimentThreshold"
                  min="-1"
                  max="0"
                  step="0.1"
                  className="mt-1 block w-full"
                  value={formData.alertSettings.negativeSentimentThreshold}
                  onChange={handleChange}
                />
                <span className="ml-3 text-sm text-gray-700">
                  {formData.alertSettings.negativeSentimentThreshold}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Alerts will be triggered when sentiment is below this threshold (-1 is most negative, 0 is neutral)
              </p>
            </div>
            
            <div>
              <label htmlFor="issueAlertThreshold" className="block text-sm font-medium text-gray-700">
                Issue Alert Threshold
              </label>
              <div className="mt-1 flex items-center">
                <input
                  type="number"
                  id="issueAlertThreshold"
                  name="alertSettings.issueAlertThreshold"
                  min="1"
                  max="20"
                  className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-36 sm:text-sm border-gray-300 rounded-md"
                  value={formData.alertSettings.issueAlertThreshold}
                  onChange={handleChange}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Number of similar issue reports needed to trigger an alert
              </p>
            </div>
            
            <div>
              <label htmlFor="autoResolveTime" className="block text-sm font-medium text-gray-700">
                Auto-Resolve Time (minutes)
              </label>
              <div className="mt-1 flex items-center">
                <input
                  type="number"
                  id="autoResolveTime"
                  name="alertSettings.autoResolveTime"
                  min="5"
                  className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-36 sm:text-sm border-gray-300 rounded-md"
                  value={formData.alertSettings.autoResolveTime}
                  onChange={handleChange}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Time in minutes before unresolved alerts are automatically resolved
              </p>
            </div>
          </div>
        </div>
      )}
      
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
          {loading ? <Loader size="sm" color="white" className="mr-2" /> : null}
          {event ? 'Update Event' : 'Create Event'}
        </Button>
      </div>
    </form>
  );
};

export default EventForm;