import { io } from 'socket.io-client';
import axios from 'axios';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = {};
    this.connectedEvents = new Set();
    this.socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

    // Ensure axios baseURL is set
    axios.defaults.baseURL = this.socketUrl;
  }

  connect() {
    return new Promise((resolve, reject) => {
      if (this.socket && this.isConnected) {
        return resolve(this.socket);
      }

      if (this.socket) {
        this.socket.disconnect();
      }

      const token = localStorage.getItem('token');

      this.socket = io(this.socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      this.socket.on('connect', () => {
        console.log('Socket connected');
        this.isConnected = true;
        resolve(this.socket);
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        if (!this.isConnected) {
          reject(error);
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        this.isConnected = false;
        this.connectedEvents.clear();
      });

      this.socket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      this.socket.on('heartbeat', (data) => {
        console.log('Heartbeat received:', data.timestamp);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.connectedEvents.clear();
    }
  }

  joinEvent(eventId) {
    if (!this.socket || !this.isConnected) {
      console.warn('Socket not connected when trying to join event:', eventId);
      return;
    }

    if (!eventId) {
      console.warn('Attempted to join event with undefined ID');
      return;
    }

    console.log('Joining event:', eventId);
    this.socket.emit('join-event', { eventId, userId: this.getUserId() });
    this.connectedEvents.add(eventId);
  }

  leaveEvent(eventId) {
    if (!this.socket || !this.isConnected) {
      return;
    }

    if (!eventId) {
      console.warn('Attempted to leave event with undefined ID');
      return;
    }

    this.socket.emit('leave-event', { eventId });
    this.connectedEvents.delete(eventId);
  }

  subscribeToAlerts(eventId) {
    if (!this.socket || !this.isConnected) {
      console.warn('Socket not connected when trying to subscribe to alerts for event:', eventId);
      return;
    }

    if (!eventId) {
      console.warn('Attempted to subscribe to alerts with undefined event ID');
      return;
    }

    console.log('Subscribing to alerts for event:', eventId);
    this.socket.emit('subscribe-alerts', { eventId });
  }

  /**
   * Submit feedback via REST API instead of socket
   * @param {Object} feedback - { event, text, user }
   * @returns {Promise}
   */
  async submitFeedback(feedback) {
    try {
      const res = await axios.post('/api/feedback/submit', feedback);
      return res.data;
    } catch (err) {
      console.error('submitFeedback error:', err?.response?.data || err.message);
      throw err;
    }
  }

  updateAlert(alertId, status, note = '') {
    if (!this.socket || !this.isConnected) {
      console.warn('Socket not connected');
      return Promise.reject('Socket not connected');
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('update-alert', {
        alertId,
        status,
        note,
        userId: this.getUserId()
      });

      this.socket.once('alert-update-confirmed', (data) => {
        resolve(data);
      });

      this.socket.once('error', (error) => {
        reject(error);
      });

      setTimeout(() => {
        reject('Timeout while updating alert');
      }, 5000);
    });
  }

  getUserId() {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        return user._id;
      }
      return null;
    } catch (error) {
      console.error('Error getting user ID:', error);
      return null;
    }
  }

  on(event, callback) {
    if (!this.socket) {
      console.warn('Socket not initialized');
      return;
    }

    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }

    this.listeners[event].push(callback);
    this.socket.on(event, callback);
  }

  off(event, callback) {
    if (!this.socket) {
      return;
    }

    if (callback && this.listeners[event]) {
      const index = this.listeners[event].indexOf(callback);
      if (index !== -1) {
        this.listeners[event].splice(index, 1);
        this.socket.off(event, callback);
      }
    } else if (this.listeners[event]) {
      this.listeners[event].forEach(cb => {
        this.socket.off(event, cb);
      });
      this.listeners[event] = [];
    }
  }

  getConnectionStatus() {
    return this.isConnected;
  }
}

const socketService = new SocketService();
export default socketService;
