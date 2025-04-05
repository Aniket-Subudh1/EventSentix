import React, { useState, useEffect, useContext } from 'react';
import { EventContext } from '../context/EventContext';
import { SocketContext } from '../context/SocketContext';
import eventService from '../services/eventService';
import analyticsService from '../services/analyticsService';

import SentimentOverview from '../components/dashboard/SentimentOverview';
import ActiveAlerts from '../components/dashboard/ActiveAlerts';
import FeedbackStream from '../components/dashboard/FeedbackStream';
import TrendingTopics from '../components/dashboard/TrendingTopics';
import SentimentChart from '../components/charts/SentimentChart';
import { Loader } from '../components/common/Loader';
import { Button } from '../components/common/Button';

// Icons
import { Calendar, Users, MessageCircle, Bell, Clock, RefreshCw } from 'react-feather';

const Dashboard = () => {
  const { selectedEvent } = useContext(EventContext);
  const { socket, connected, newFeedback, newAlert } = useContext(SocketContext);
  
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState('day'); // 'hour', 'day', 'week'
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  
  // Get the event ID safely
  const getEventId = () => {
    if (!selectedEvent) return null;
    return selectedEvent.id || selectedEvent._id || selectedEvent.eventId || selectedEvent.event_id;
  };
  
  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const eventId = getEventId();
      if (!eventId) {
        throw new Error('Invalid or missing event ID');
      }
      
      console.log("Fetching dashboard data for event:", eventId);
      const data = await analyticsService.getDashboardData(eventId);
      setDashboardData(data);
      setLastRefresh(Date.now());
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };
  
  // Initial data load when selected event changes
  useEffect(() => {
    if (selectedEvent) {
      fetchDashboardData();
    }
  }, [selectedEvent]);
  
  // Set up socket listeners for real-time updates
  useEffect(() => {
    if (socket && connected && selectedEvent) {
      const eventId = getEventId();
      
      if (!eventId) return;

      // Join the event channel to receive updates
      socket.emit('join-event', { eventId });
      socket.emit('subscribe-alerts', { eventId });
      
      // Handler for new feedback
      const handleNewFeedback = (feedback) => {
        console.log("New feedback received via socket:", feedback);
        
        if (feedback.event === eventId) {
          setDashboardData(prev => {
            if (!prev) return prev;
            
            // Determine sentiment counter to update
            const sentimentKey = feedback.sentiment || 'neutral';
            
            // Create updated dashboardData
            return {
              ...prev,
              feedback: {
                ...prev.feedback,
                latest: [feedback, ...prev.feedback.latest.slice(0, 4)],
                recent: (prev.feedback.recent || 0) + 1,
                sentiment: {
                  ...prev.feedback.sentiment,
                  [sentimentKey]: {
                    ...prev.feedback.sentiment[sentimentKey],
                    count: (prev.feedback.sentiment[sentimentKey]?.count || 0) + 1
                  }
                }
              }
            };
          });
        }
      };
      
      // Handler for new alerts
      const handleNewAlert = (alert) => {
        console.log("New alert received via socket:", alert);
        
        if (alert.event === eventId) {
          setDashboardData(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              alerts: {
                ...prev.alerts,
                latest: [alert, ...prev.alerts.latest.slice(0, 4)],
                active: (prev.alerts.active || 0) + 1
              }
            };
          });
        }
      };
      
      // Handler for alert updates
      const handleAlertUpdate = (alert) => {
        console.log("Alert update received via socket:", alert);
        
        if (alert.event === eventId) {
          setDashboardData(prev => {
            if (!prev) return prev;
            
            // Update the alert in the list
            const updatedLatest = prev.alerts.latest.map(a => 
              a._id === alert._id ? alert : a
            );
            
            // Decrement active count if resolved
            const activeAdjustment = alert.status === 'resolved' ? -1 : 0;
            
            return {
              ...prev,
              alerts: {
                ...prev.alerts,
                latest: updatedLatest,
                active: Math.max(0, (prev.alerts.active || 0) + activeAdjustment)
              }
            };
          });
        }
      };
      
      // Set up the listeners
      socket.on('new-feedback', handleNewFeedback);
      socket.on('new-alert', handleNewAlert);
      socket.on('alert-updated', handleAlertUpdate);
      
      // Clean up on unmount
      return () => {
        socket.off('new-feedback', handleNewFeedback);
        socket.off('new-alert', handleNewAlert);
        socket.off('alert-updated', handleAlertUpdate);
        socket.emit('leave-event', { eventId });
      };
    }
  }, [socket, connected, selectedEvent]);
  
  // Process new feedback from context
  useEffect(() => {
    if (newFeedback && selectedEvent) {
      const eventId = getEventId();
      if (newFeedback.event === eventId) {
        console.log("New feedback from context:", newFeedback);
        
        setDashboardData(prev => {
          if (!prev) return prev;
          
          const sentimentKey = newFeedback.sentiment || 'neutral';
          
          return {
            ...prev,
            feedback: {
              ...prev.feedback,
              latest: [newFeedback, ...prev.feedback.latest.slice(0, 4)],
              recent: (prev.feedback.recent || 0) + 1,
              sentiment: {
                ...prev.feedback.sentiment,
                [sentimentKey]: {
                  ...prev.feedback.sentiment[sentimentKey],
                  count: (prev.feedback.sentiment[sentimentKey]?.count || 0) + 1
                }
              }
            }
          };
        });
      }
    }
  }, [newFeedback, selectedEvent]);
  
  // Process new alerts from context
  useEffect(() => {
    if (newAlert && selectedEvent) {
      const eventId = getEventId();
      if (newAlert.event === eventId) {
        console.log("New alert from context:", newAlert);
        
        setDashboardData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            alerts: {
              ...prev.alerts,
              latest: [newAlert, ...prev.alerts.latest.slice(0, 4)],
              active: (prev.alerts.active || 0) + 1
            }
          };
        });
      }
    }
  }, [newAlert, selectedEvent]);
  
  // Auto-refresh dashboard data periodically
  useEffect(() => {
    if (!selectedEvent) return;
    
    const refreshInterval = setInterval(() => {
      fetchDashboardData();
    }, 60000); // Every minute
    
    return () => clearInterval(refreshInterval);
  }, [selectedEvent]);
  
  // If no event is selected, show a message
  if (!selectedEvent) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <h2 className="text-xl mb-4">Select an event to view dashboard</h2>
        <Button 
          variant="primary"
          onClick={() => window.location.href = '/events'}
        >
          Go to Events
        </Button>
      </div>
    );
  }
  
  // Show loading indicator if initial load
  if (loading && !dashboardData) {
    return <Loader size="lg" className="mt-10" />;
  }
  
  // Show error if something went wrong
  if (error && !dashboardData) {
    return (
      <div className="text-center p-6 bg-red-50 text-red-600 rounded-lg mt-4">
        <p className="text-lg font-semibold">{error}</p>
        <p className="mt-2 text-sm">
          Event data: {selectedEvent ? JSON.stringify(selectedEvent).substring(0, 100) + '...' : 'No event selected'}
        </p>
        <Button 
          variant="danger"
          className="mt-4"
          onClick={fetchDashboardData}
        >
          Retry
        </Button>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      {/* Event Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">{selectedEvent.name}</h1>
            <div className="flex items-center text-gray-500">
              <Calendar size={16} className="mr-2" />
              {selectedEvent.startDate && new Date(selectedEvent.startDate).toLocaleDateString()} - 
              {selectedEvent.endDate && new Date(selectedEvent.endDate).toLocaleDateString()}
            </div>
          </div>
          <div className="flex space-x-2">
            <div className={`px-3 py-1 rounded-full text-white ${selectedEvent.isActive ? 'bg-green-500' : 'bg-red-500'}`}>
              {selectedEvent.isActive ? 'Active' : 'Inactive'}
            </div>
            <Button 
              variant="primary"
              icon={<RefreshCw size={16} />}
              onClick={fetchDashboardData}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>
        </div>
        
        {loading && dashboardData && (
          <div className="mt-2 text-sm text-gray-500">
            Refreshing data...
          </div>
        )}
      </div>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between">
            <div>
              <p className="text-gray-500 mb-1">Active Alerts</p>
              <h3 className="text-2xl font-bold">{dashboardData?.alerts?.active || 0}</h3>
            </div>
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <Bell size={24} className="text-red-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between">
            <div>
              <p className="text-gray-500 mb-1">Recent Feedback</p>
              <h3 className="text-2xl font-bold">{dashboardData?.feedback?.recent || 0}</h3>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <MessageCircle size={24} className="text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between">
            <div>
              <p className="text-gray-500 mb-1">Connected Users</p>
              <h3 className="text-2xl font-bold">{dashboardData?.event?.connectedUsers || 0}</h3>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <Users size={24} className="text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between">
            <div>
              <p className="text-gray-500 mb-1">Time Remaining</p>
              <h3 className="text-2xl font-bold">{dashboardData?.event?.daysRemaining || '0'} days</h3>
            </div>
            <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
              <Clock size={24} className="text-purple-600" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sentiment Overview */}
          <SentimentOverview 
            sentimentData={dashboardData?.feedback?.sentiment} 
            className="bg-white rounded-lg shadow p-6"
          />
          
          {/* Sentiment Timeline */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Sentiment Timeline</h3>
              <div className="flex space-x-2">
                <button 
                  className={`px-3 py-1 rounded ${timeframe === 'hour' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                  onClick={() => setTimeframe('hour')}
                >
                  Hourly
                </button>
                <button 
                  className={`px-3 py-1 rounded ${timeframe === 'day' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                  onClick={() => setTimeframe('day')}
                >
                  Daily
                </button>
                <button 
                  className={`px-3 py-1 rounded ${timeframe === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                  onClick={() => setTimeframe('week')}
                >
                  Weekly
                </button>
              </div>
            </div>
            <SentimentChart timeframe={timeframe} eventId={getEventId()} height={300} />
          </div>
          
          {/* Trending Topics */}
          <TrendingTopics 
            topics={dashboardData?.trends} 
            className="bg-white rounded-lg shadow p-6"
          />
        </div>
        
        {/* Right Column */}
        <div className="space-y-6">
          {/* Active Alerts */}
          <ActiveAlerts 
            alerts={dashboardData?.alerts?.latest || []} 
            className="bg-white rounded-lg shadow p-6"
          />
          
          {/* Live Feedback */}
          <FeedbackStream 
            feedback={dashboardData?.feedback?.latest || []} 
            className="bg-white rounded-lg shadow p-6"
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;