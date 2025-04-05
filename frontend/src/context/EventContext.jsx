import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import eventService from '../services/eventService';
import { AuthContext } from './AuthContext';

export const EventContext = createContext();

export const EventProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(null);

  const fetchEvents = useCallback(async () => {
    const now = Date.now();
    if (lastFetchTime && now - lastFetchTime < 1000) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setLastFetchTime(now);
      
      const response = await eventService.getEvents({ active: true });
      console.log('Fetched events:', response.data); // Debug log
      setEvents(response.data);
      
      // Select first event if none selected
      if (response.data.length > 0 && !selectedEvent) {
        console.log('Setting default selected event:', response.data[0]);
        setSelectedEvent(response.data[0]);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch events');
      console.error('Fetch events error:', err);
    } finally {
      setLoading(false);
    }
  }, [lastFetchTime, selectedEvent]);

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user, fetchEvents]);

  useEffect(() => {
    if (events.length > 0 && !selectedEvent) {
      const savedEventId = localStorage.getItem('selectedEventId');
      if (savedEventId) {
        const event = events.find(e => e._id === savedEventId);
        if (event) {
          console.log('Restoring selected event from localStorage:', event);
          setSelectedEvent(event);
        } else {
          console.log('No matching event found for saved ID:', savedEventId);
          setSelectedEvent(events[0]); // Fallback to first event
        }
      }
    }
  }, [events, selectedEvent]);

  useEffect(() => {
    if (selectedEvent) {
      console.log('Selected event updated:', selectedEvent);
      localStorage.setItem('selectedEventId', selectedEvent._id);
    }
  }, [selectedEvent]);

  const createEvent = async (eventData) => {
    try {
      setLoading(true);
      setError(null);
      const newEvent = await eventService.createEvent(eventData);
      setEvents(prev => [...prev, newEvent]);
      return newEvent;
    } catch (err) {
      setError(err.message || 'Failed to create event');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateEvent = async (eventId, eventData) => {
    try {
      setLoading(true);
      setError(null);
      const updatedEvent = await eventService.updateEvent(eventId, eventData);
      setEvents(prev => prev.map(event => (
        event._id === eventId ? updatedEvent : event
      )));
      
      if (selectedEvent && selectedEvent._id === eventId) {
        setSelectedEvent(updatedEvent);
      }
      
      return updatedEvent;
    } catch (err) {
      setError(err.message || 'Failed to update event');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteEvent = async (eventId) => {
    try {
      setLoading(true);
      setError(null);
      await eventService.deleteEvent(eventId);
      setEvents(prev => prev.filter(event => event._id !== eventId));
      
      if (selectedEvent && selectedEvent._id === eventId) {
        setSelectedEvent(events.length > 1 ? events[0] : null); // Set to first event or null
        localStorage.removeItem('selectedEventId');
      }
      
      return true;
    } catch (err) {
      setError(err.message || 'Failed to delete event');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const toggleEventActive = async (eventId) => {
    try {
      setLoading(true);
      setError(null);
      const result = await eventService.toggleEventActive(eventId);
      
      setEvents(prev => prev.map(event => (
        event._id === eventId ? { ...event, isActive: result.isActive } : event
      )));
      
      if (selectedEvent && selectedEvent._id === eventId) {
        setSelectedEvent(prev => ({ ...prev, isActive: result.isActive }));
      }
      
      return result;
    } catch (err) {
      setError(err.message || 'Failed to toggle event status');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
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
  };

  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  );
};