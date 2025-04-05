import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { EventContext } from '../context/EventContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Loader } from '../components/common/Loader';
import { Calendar, MapPin, Clock, Edit, Trash2, Power, ZapOff } from 'react-feather';
import { QRCodeCanvas } from 'qrcode.react';

// EventForm Component
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="mb-4 rounded-xl bg-red-900/20 p-4 text-sm text-red-300 animate-fade-in border border-red-700">
          {error}
        </div>
      )}
      
      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-300">Event Name</label>
          <input
            type="text"
            id="name"
            name="name"
            className="mt-1 block w-full rounded-xl bg-[#00001A] border-[#3D3D3D] text-white shadow-sm focus:border-[#C53070] focus:ring-[#C53070] transition-all duration-300"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-300">Description</label>
          <textarea
            id="description"
            name="description"
            rows="3"
            className="mt-1 block w-full rounded-xl bg-[#00001A] border-[#3D3D3D] text-white shadow-sm focus:border-[#C53070] focus:ring-[#C53070] transition-all duration-300"
            value={formData.description}
            onChange={handleChange}
            required
          />
        </div>
        
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-300">Location</label>
          <input
            type="text"
            id="location"
            name="location"
            className="mt-1 block w-full rounded-xl bg-[#00001A] border-[#3D3D3D] text-white shadow-sm focus:border-[#C53070] focus:ring-[#C53070] transition-all duration-300"
            value={formData.location}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-300">Start Date</label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              className="mt-1 block w-full rounded-xl bg-[#00001A] border-[#3D3D3D] text-white shadow-sm focus:border-[#C53070] focus:ring-[#C53070] transition-all duration-300"
              value={formData.startDate}
              onChange={handleChange}
              required
            />
          </div>
          
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-300">End Date</label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              className="mt-1 block w-full rounded-xl bg-[#00001A] border-[#3D3D3D] text-white shadow-sm focus:border-[#C53070] focus:ring-[#C53070] transition-all duration-300"
              value={formData.endDate}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Hashtags</label>
          <div className="flex">
            <input
              type="text"
              className="focus:ring-[#C53070] focus:border-[#C53070] block w-full sm:text-sm bg-[#00001A] border-[#3D3D3D] text-white rounded-xl rounded-r-none transition-all duration-300"
              placeholder="Add hashtag (e.g., #EventName)"
              value={hashtagInput}
              onChange={(e) => setHashtagInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addHashtag())}
            />
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-[#C53070] text-sm font-medium rounded-r-xl text-white bg-[#9D174D] hover:bg-[#C53070] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C53070] transition-all duration-300 transform hover:scale-105 hover:rotate-1"
              onClick={addHashtag}
            >
              Add
            </button>
          </div>
          
          <div className="mt-2 flex flex-wrap gap-2">
            {formData.socialTracking.hashtags.map((tag, index) => (
              <span 
                key={index}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#9D174D]/20 text-[#C53070] transform transition-all duration-200 hover:scale-110 animate-fade-in border border-[#C53070]"
              >
                {tag}
                <button
                  type="button"
                  className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full text-[#C53070] hover:bg-[#9D174D] hover:text-white transition-all duration-200"
                  onClick={() => removeHashtag(tag)}
                >
                  ×
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
          className="bg-[#00001A] hover:bg-[#3D3D3D] text-white transition-all duration-300 transform hover:scale-105 hover:rotate-1 border border-[#3D3D3D]"
        >
          Cancel
        </Button>
        
        <Button
          type="submit"
          variant="primary"
          disabled={loading}
          className="bg-[#9D174D] hover:bg-[#C53070] text-white transition-all duration-300 transform hover:scale-105 hover:rotate-1 border border-[#C53070]"
        >
          {loading ? <Loader size="sm" color="white" className="mr-2 animate-spin" /> : null}
          {event ? 'Update Event' : 'Create Event'}
        </Button>
      </div>
    </form>
  );
};

// EventCard Component with increased QR size and Download option
const EventCard = React.memo(({ event, onEdit, onDelete, onToggleActive, onSelect, isSelected }) => {
  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  
  const today = new Date();
  const isUpcoming = startDate > today;
  const isOngoing = startDate <= today && endDate >= today;
  
  let timeStatus;
  let timeStatusClass;
  
  if (isUpcoming) {
    const daysUntil = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24));
    timeStatus = `Starts in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`;
    timeStatusClass = 'text-[#C53070]';
  } else if (isOngoing) {
    const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
    timeStatus = `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`;
    timeStatusClass = 'text-green-400';
  } else {
    const daysPassed = Math.ceil((today - endDate) / (1000 * 60 * 60 * 24));
    timeStatus = `Ended ${daysPassed} day${daysPassed !== 1 ? 's' : ''} ago`;
    timeStatusClass = 'text-gray-400';
  }
  
  // Ref for QRCodeCanvas for download
  const qrRef = useRef(null);
  
  const handleDownloadQR = () => {
    if (qrRef.current) {
      const url = qrRef.current.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `event-${event._id}-qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
  
  return (
    <Card className={`bg-white/5 backdrop-blur-lg rounded-xl shadow-xl transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:rotate-1 border ${isSelected ? 'border-[#C53070]' : 'border-[#3D3D3D]'}`}>
      <div className="p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white bg-gradient-to-r from-[#9D174D] to-[#C53070] bg-clip-text text-transparent">
            {event.name}
          </h3>
          <div className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 border ${event.isActive ? 'bg-green-500/20 text-green-300 border-green-700' : 'bg-red-500/20 text-red-300 border-red-700'}`}>
            {event.isActive ? 'Active' : 'Inactive'}
          </div>
        </div>
        
        {event._id && (
          <div className="mt-4 transform transition-all duration-300 hover:scale-110 space-y-2">
            <QRCodeCanvas
              ref={qrRef}
              value={`${window.location.origin}/event/${event._id}/engage`}
              size={150}
              level="H"
              includeMargin={true}
              className="rounded-lg shadow-md border border-[#3D3D3D]"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadQR}
              className="bg-white/5 border border-[#3D3D3D] text-white hover:bg-[#9D174D]/20 transition-all duration-300 transform hover:scale-105"
            >
              Download QR Code
            </Button>
          </div>
        )}

        <p className="mt-2 text-sm text-gray-300 line-clamp-2">{event.description}</p>
        
        <div className="mt-4 space-y-3 text-sm text-gray-400">
          <div className="flex items-center">
            <Calendar size={16} className="mr-2 text-[#C53070]" />
            <span>{startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}</span>
          </div>
          
          <div className="flex items-center">
            <MapPin size={16} className="mr-2 text-[#C53070]" />
            <span>{event.location}</span>
          </div>
          
          <div className={`flex items-center ${timeStatusClass}`}>
            <Clock size={16} className="mr-2" />
            <span>{timeStatus}</span>
          </div>
          
          {event.socialTracking?.hashtags && event.socialTracking.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {event.socialTracking.hashtags.map((tag, index) => (
                <span 
                  key={index}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#9D174D]/20 text-[#C53070] transform transition-all duration-200 hover:scale-110 animate-fade-in border border-[#C53070]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="p-5 pt-0 flex items-center justify-between">
        <Button
          variant="primary"
          size="sm"
          onClick={() => onSelect(event)}
          className="bg-[#9D174D] hover:bg-[#C53070] text-white transition-all duration-300 transform hover:scale-105 hover:rotate-1 border border-[#C53070]"
        >
          Select Event
        </Button>
        
        <div className="flex space-x-2">
          <button
            onClick={() => onToggleActive(event._id)}
            className="p-2 rounded-full text-gray-400 hover:text-green-500 hover:bg-green-500/10 transition-all duration-200 transform hover:scale-110 hover:rotate-3 border border-[#3D3D3D]"
            title={event.isActive ? 'Deactivate' : 'Activate'}
          >
            {event.isActive ? <ZapOff size={18} /> : <Power size={18} />}
          </button>
          
          <button
            onClick={() => onEdit(event)}
            className="p-2 rounded-full text-gray-400 hover:text-[#C53070] hover:bg-[#9D174D]/10 transition-all duration-200 transform hover:scale-110 hover:rotate-3 border border-[#3D3D3D]"
            title="Edit"
          >
            <Edit size={18} />
          </button>
          
          <button
            onClick={() => onDelete(event._id)}
            className="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-all duration-200 transform hover:scale-110 hover:rotate-3 border border-[#3D3D3D]"
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
            className="bg-[#00001A] hover:bg-[#3D3D3D] text-white transition-all duration-300 transform hover:scale-105 hover:rotate-1 border border-[#3D3D3D]"
          >
            Cancel
          </Button>
          
          <Button
            variant="danger"
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white transition-all duration-300 transform hover:scale-105 hover:rotate-1 border border-red-700"
          >
            {isDeleting ? <Loader size="sm" color="white" className="mr-2 animate-spin" /> : null}
            Delete
          </Button>
        </>
      }
      className="bg-[#00001A] rounded-xl shadow-xl border border-[#3D3D3D] animate-fade-in"
    >
      <p className="text-gray-300">
        Are you sure you want to delete event <span className="font-medium text-white">{eventName}</span>?
      </p>
      <p className="mt-2 text-sm text-gray-400">
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
  const [filter, setFilter] = useState('all');
  
  useEffect(() => {
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
  
  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    if (filter === 'active') return event.isActive;
    if (filter === 'inactive') return !event.isActive;
    return true;
  });
  
  return (
    <div className="p-6 bg-[#00001A] min-h-screen">
      <div className="mb-6 flex items-center justify-between transform transition-all duration-300">
        <h1 className="text-3xl font-bold text-white bg-gradient-to-r from-[#9D174D] to-[#C53070] bg-clip-text text-transparent animate-fade-in">
          Events
        </h1>
        
        <Button
          variant="primary"
          onClick={() => setShowCreateModal(true)}
          icon={<Calendar size={18} className="mr-2" />}
          className="bg-[#9D174D] hover:bg-[#C53070] text-white transition-all duration-300 transform hover:scale-105 hover:rotate-1 hover:shadow-lg border border-[#C53070]"
        >
          Create Event
        </Button>
      </div>
      
      {error && (
        <div className="mb-6 rounded-xl bg-red-900/20 p-4 text-sm text-red-300 animate-fade-in border border-red-700">
          {error}
        </div>
      )}
      
      <div className="mb-6 flex space-x-3">
        {['all', 'active', 'inactive'].map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
            className={`${
              filter === f 
                ? 'bg-[#9D174D] text-white border-[#C53070]' 
                : 'bg-white/5 text-gray-300 hover:bg-[#3D3D3D] border-[#3D3D3D]'
            } transition-all duration-300 transform hover:scale-105 hover:rotate-1 border`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>
      
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader size="lg" className="text-[#C53070] animate-spin" />
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl bg-white/5 backdrop-blur-lg border border-[#3D3D3D] p-6 text-center transform transition-all duration-300 hover:shadow-xl hover:rotate-1 animate-fade-in">
          <Calendar size={48} className="mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-white">No events found</h3>
          <p className="mt-1 text-sm text-gray-400">
            Get started by creating a new event.
          </p>
          <Button
            variant="primary"
            className="mt-4 bg-[#9D174D] hover:bg-[#C53070] text-white transition-all duration-300 transform hover:scale-105 hover:rotate-1 border border-[#C53070]"
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
      
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Event"
        className="bg-[#00001A] rounded-xl shadow-xl border border-[#3D3D3D] animate-fade-in"
      >
        <EventForm
          onSubmit={handleCreateSubmit}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>
      
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Event"
        className="bg-[#00001A] rounded-xl shadow-xl border border-[#3D3D3D] animate-fade-in"
      >
        <EventForm
          event={currentEvent}
          onSubmit={handleEditSubmit}
          onCancel={() => setShowEditModal(false)}
        />
      </Modal>
      
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
