import React, { useState, useEffect, useContext, useCallback } from 'react';
import { EventContext } from '../context/EventContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Loader } from '../components/common/Loader';
import { Calendar, MapPin, Clock, Edit, Trash2, Power, ZapOff } from 'react-feather';
import { QRCodeCanvas } from 'qrcode.react';


const EventForm = ({ event, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    startDate: '',
    endDate: '',
    socialTracking: {
      hashtags: []
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hashtagInput, setHashtagInput] = useState('');
  
  useEffect(() => {
    if (event) {
      // Format dates for input
      const startDate = new Date(event.startDate);
      const endDate = new Date(event.endDate);
      
      setFormData({
        name: event.name || '',
        description: event.description || '',
        location: event.location || '',
        startDate: startDate.toISOString().split('T')[0] || '',
        endDate: endDate.toISOString().split('T')[0] || '',
        socialTracking: {
          hashtags: event.socialTracking?.hashtags || []
        }
      });
    }
  }, [event]);
  
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
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
  
  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      
      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Event Name
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
            Description
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
            Location
          </label>
          <input
            type="text"
            id="location"
            name="location"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            value={formData.location}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={formData.startDate}
              onChange={handleChange}
              required
            />
          </div>
          
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={formData.endDate}
              onChange={handleChange}
              required
            />
          </div>
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
          {loading ? <Loader size="sm" color="white" className="mr-2" /> : null}
          {event ? 'Update Event' : 'Create Event'}
        </Button>
      </div>
    </form>
  );
};

const EventCard = React.memo(({ event, onEdit, onDelete, onToggleActive, onSelect, isSelected }) => {
  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  
  // Calculate days remaining or days passed
  const today = new Date();
  const isUpcoming = startDate > today;
  const isOngoing = startDate <= today && endDate >= today;
  
  let timeStatus;
  let timeStatusClass;
  
  if (isUpcoming) {
    const daysUntil = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24));
    timeStatus = `Starts in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`;
    timeStatusClass = 'text-blue-600';
  } else if (isOngoing) {
    const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
    timeStatus = `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`;
    timeStatusClass = 'text-green-600';
  } else {
    const daysPassed = Math.ceil((today - endDate) / (1000 * 60 * 60 * 24));
    timeStatus = `Ended ${daysPassed} day${daysPassed !== 1 ? 's' : ''} ago`;
    timeStatusClass = 'text-gray-500';
  }
  
  return (
    <Card className={`transition-all duration-200 ${isSelected ? 'ring-2 ring-blue-500' : 'hover:shadow-lg'}`}>
      <div>
        <div className="flex justify-between">
          <h3 className="text-lg font-medium">{event.name}</h3>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${event.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
            {event.isActive ? 'Active' : 'Inactive'}
          </div>
        </div>
        {event._id && (
  <div className="mt-4">
    <QRCodeCanvas
      value={`${window.location.origin}/event/${event._id}/engage`}
      size={96}
      level="H"
      includeMargin={true}
    />
  </div>
)}


        <p className="mt-1 text-sm text-gray-600 line-clamp-2">{event.description}</p>
        
        <div className="mt-4 space-y-2">
          <div className="flex items-center text-sm text-gray-500">
            <Calendar size={16} className="mr-2" />
            <span>
              {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
            </span>
          </div>
          
          <div className="flex items-center text-sm text-gray-500">
            <MapPin size={16} className="mr-2" />
            <span>{event.location}</span>
          </div>
          
          <div className={`flex items-center text-sm ${timeStatusClass}`}>
            <Clock size={16} className="mr-2" />
            <span>{timeStatus}</span>
          </div>
          
          {event.socialTracking?.hashtags && event.socialTracking.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {event.socialTracking.hashtags.map((tag, index) => (
                <span 
                  key={index}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-5 flex items-center justify-between">
        <Button
          variant="primary"
          size="sm"
          onClick={() => onSelect(event)}
        >
          Select Event
        </Button>
        
        <div className="flex space-x-2">
          <button
            onClick={() => onToggleActive(event._id)}
            className="p-1 rounded-full text-gray-400 hover:text-gray-500"
            title={event.isActive ? 'Deactivate' : 'Activate'}
          >
            {event.isActive ? <ZapOff size={18} /> : <Power size={18} />}
          </button>
          
          <button
            onClick={() => onEdit(event)}
            className="p-1 rounded-full text-gray-400 hover:text-gray-500"
            title="Edit"
          >
            <Edit size={18} />
          </button>
          
          <button
            onClick={() => onDelete(event._id)}
            className="p-1 rounded-full text-gray-400 hover:text-red-500"
            title="Delete"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </Card>
  );
});

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, eventName, isDeleting }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Event"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          
          <Button
            variant="danger"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader size="sm" color="white" className="mr-2" /> : null}
            Delete
          </Button>
        </>
      }
    >
      <p className="text-gray-700">
        Are you sure you want to delete event <span className="font-medium">{eventName}</span>?
      </p>
      <p className="mt-2 text-sm text-gray-500">
        This action cannot be undone. All feedback, alerts, and analytics data for this event will be permanently deleted.
      </p>
    </Modal>
  );
};

const Events = () => {
  const { 
    events, 
    selectedEvent, 
    setSelectedEvent,
    loading, 
    error, 
    fetchEvents, 
    createEvent, 
    updateEvent, 
    deleteEvent, 
    toggleEventActive 
  } = useContext(EventContext);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'inactive'
  
  // Only fetch events on initial component mount
  useEffect(() => {
    // Only fetch if we don't already have events
    if (events.length === 0 && !loading) {
      fetchEvents();
    }
  }, [fetchEvents, events.length, loading]);
  
  const handleCreateSubmit = useCallback(async (eventData) => {
    await createEvent(eventData);
    setShowCreateModal(false);
  }, [createEvent]);
  
  const handleEditSubmit = useCallback(async (eventData) => {
    if (!currentEvent || !currentEvent._id) return;
    await updateEvent(currentEvent._id, eventData);
    setShowEditModal(false);
  }, [currentEvent, updateEvent]);
  
  const handleDeleteConfirm = useCallback(async () => {
    if (!currentEvent || !currentEvent._id) return;
    try {
      setIsDeleting(true);
      await deleteEvent(currentEvent._id);
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
    }
  }, [currentEvent, deleteEvent]);
  
  const handleEdit = useCallback((event) => {
    setCurrentEvent(event);
    setShowEditModal(true);
  }, []);
  
  const handleDelete = useCallback((eventId) => {
    const event = events.find(e => e._id === eventId);
    if (event) {
      setCurrentEvent(event);
      setShowDeleteModal(true);
    }
  }, [events]);
  
  const handleToggleActive = useCallback(async (eventId) => {
    await toggleEventActive(eventId);
  }, [toggleEventActive]);
  
  const handleSelectEvent = useCallback((event) => {
    setSelectedEvent(event);
  }, [setSelectedEvent]);
  
  // Filter events based on selected filter
  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    if (filter === 'active') return event.isActive;
    if (filter === 'inactive') return !event.isActive;
    return true;
  });
  
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Events</h1>
        
        <Button
          variant="primary"
          onClick={() => setShowCreateModal(true)}
          icon={<Calendar size={18} className="mr-2" />}
        >
          Create Event
        </Button>
      </div>
      
      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      
      <div className="mb-6 flex space-x-2">
        <Button
          variant={filter === 'all' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All Events
        </Button>
        
        <Button
          variant={filter === 'active' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setFilter('active')}
        >
          Active
        </Button>
        
        <Button
          variant={filter === 'inactive' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setFilter('inactive')}
        >
          Inactive
        </Button>
      </div>
      
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader size="lg" />
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
          <Calendar size={48} className="mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900">No events found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new event.
          </p>
          <Button
            variant="primary"
            className="mt-4"
            onClick={() => setShowCreateModal(true)}
          >
            Create Event
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map(event => (
            <EventCard
              key={event._id}
              event={event}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
              onSelect={handleSelectEvent}
              isSelected={selectedEvent && selectedEvent._id === event._id}
            />
          ))}
        </div>
      )}
      
      {/* Create Event Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Event"
      >
        <EventForm
          onSubmit={handleCreateSubmit}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>
      
      {/* Edit Event Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Event"
      >
        <EventForm
          event={currentEvent}
          onSubmit={handleEditSubmit}
          onCancel={() => setShowEditModal(false)}
        />
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        eventName={currentEvent?.name}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default Events;