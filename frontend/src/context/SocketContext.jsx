import React, { createContext, useState, useEffect, useContext } from 'react';
import socketService from '../services/socketService';
import { AuthContext } from './AuthContext';
import { EventContext } from './EventContext';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const { selectedEvent } = useContext(EventContext);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [newFeedback, setNewFeedback] = useState(null);
  const [newAlert, setNewAlert] = useState(null);

  // Initialize socket when user logs in
  useEffect(() => {
    if (user) {
      const initSocket = async () => {
        try {
          const socketInstance = await socketService.connect();
          setSocket(socketInstance);
          setConnected(true);
          
          // Set up event listeners for feedback and alerts
          socketInstance.on('new-feedback', handleNewFeedback);
          socketInstance.on('new-alert', handleNewAlert);
          socketInstance.on('alert-updated', handleAlertUpdate);
          
          // Connection status listeners
          socketInstance.on('disconnect', () => setConnected(false));
          socketInstance.on('connect', () => setConnected(true));
        } catch (error) {
          console.error('Socket initialization error:', error);
          setConnected(false);
        }
      };
      
      initSocket();
      
      // Cleanup on unmount
      return () => {
        socketService.disconnect();
        setSocket(null);
        setConnected(false);
      };
    }
  }, [user]);

  // Join event room when selected event changes
  useEffect(() => {
    if (socket && connected && selectedEvent) {
      // Make sure we're using _id, not id
      socketService.joinEvent(selectedEvent._id);
      socketService.subscribeToAlerts(selectedEvent._id);
      
      console.log(`Joined event room: ${selectedEvent._id}`);
    }
  }, [socket, connected, selectedEvent]);

  const handleNewFeedback = (feedback) => {
    setNewFeedback(feedback);
  };

  const handleNewAlert = (alert) => {
    setNewAlert(alert);
  };

  const handleAlertUpdate = (alert) => {
    // Handle alert updates
    console.log('Alert updated:', alert);
  };

  const submitFeedback = async (feedbackData) => {
    if (!connected || !socket) {
      throw new Error('Socket not connected');
    }
    
    // Make sure we're using the correct event ID
    if (selectedEvent && feedbackData.event === undefined) {
      feedbackData.event = selectedEvent._id;
    }
    
    return socketService.submitFeedback(feedbackData);
  };

  const updateAlert = async (alertId, status, note) => {
    if (!connected || !socket) {
      throw new Error('Socket not connected');
    }
    
    return socketService.updateAlert(alertId, status, note);
  };

  const value = {
    socket,
    connected,
    newFeedback,
    newAlert,
    submitFeedback,
    updateAlert
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};