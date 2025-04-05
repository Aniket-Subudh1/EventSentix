import React, { useState, useEffect, useContext } from 'react';
import { EventContext } from '../context/EventContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Loader } from '../components/common/Loader';
import SentimentChart from '../components/charts/SentimentChart';
import analyticsService from '../services/analyticsService';
import { useLocation, useParams } from 'react-router-dom';
import { useCallback } from 'react';
import {
  BarChart2,
  Download,
  RefreshCw,
  Calendar,
  MessageCircle,
  Activity,
  TrendingUp
} from 'react-feather';

const AnalyticsDashboard = () => {
  const { selectedEvent: contextEvent, events } = useContext(EventContext);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('day');
  
  const location = useLocation();
  const { eventId } = useParams();
  const eventFromState = location.state?.event;

  const selectedEvent = eventFromState || 
    (eventId && events.find(e => e.id === eventId || e._id === eventId)) || 
    contextEvent;

  const fetchEventSummary = useCallback(async () => {
    const effectiveEventId = selectedEvent?._id || selectedEvent?.id;
    if (!effectiveEventId) {
      setError('Cannot fetch summary: Event ID is undefined');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await analyticsService.getEventSummary(effectiveEventId);
      setSummary(data);
    } catch (err) {
      setError('Failed to load analytics data: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }, [selectedEvent]);

  useEffect(() => {
    const effectiveEventId = selectedEvent?._id || selectedEvent?.id;
    if (effectiveEventId) {
      fetchEventSummary();
    } else {
      setError('No event selected. Please select an event from the navbar or events page.');
      setLoading(false);
    }
  }, [selectedEvent, fetchEventSummary]);

  const handleExportData = async () => {
    try {
      const format = 'csv';
      const blob = await analyticsService.exportAnalyticsData(selectedEvent.id, {
        format,
        includeAll: true
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedEvent.name.replace(/\s+/g, '_')}_export.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setError('Failed to export data. Please try again.');
    }
  };

  if (loading && !summary) {
    return <Loader size="lg" className="mt-10" />;
  }

  if (error) {
    return (
      <div className="text-center p-6 bg-red-900/20 text-red-400 rounded-lg mt-4 animate-fade-in">
        <p className="text-lg font-semibold">{error}</p>
        <Button
          variant="danger"
          className="mt-4 bg-accent hover:bg-accent-dark text-accent-foreground transition-colors duration-200"
          onClick={fetchEventSummary}
          icon={<RefreshCw size={16} />}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center p-6 text-primary-foreground/70">
        No analytics data available for this event.
      </div>
    );
  }

  const renderSentimentBox = (sentiment, count, percentage) => {
    const bgColors = {
      positive: 'bg-green-500/20',
      neutral: 'bg-blue-500/20',
      negative: 'bg-red-500/20'
    };
    
    return (
      <div className={`p-4 rounded-lg ${bgColors[sentiment]}`}>
        <p className="text-primary-foreground/70 capitalize">{sentiment}</p>
        <p className="text-2xl font-bold text-primary-foreground">{count}</p>
        <p className="text-sm text-primary-foreground/70">{percentage}%</p>
      </div>
    );
  };

  return (
    <div className="p-6 bg-primary-dark min-h-screen">
      {/* Event Header */}
      <div className="bg-primary rounded-lg shadow-lg shadow-black/10 p-6 mb-6 animate-slide-in">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2 text-primary-foreground">{selectedEvent.name}</h1>
            <div className="flex items-center text-primary-foreground/70">
              <Calendar size={16} className="mr-2 text-accent" />
              {new Date(selectedEvent.startDate).toLocaleDateString()} - 
              {new Date(selectedEvent.endDate).toLocaleDateString()}
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="primary"
              icon={<Download size={16} />}
              onClick={handleExportData}
              className="bg-accent hover:bg-accent-dark text-accent-foreground transition-all duration-200 transform hover:scale-105"
            >
              Export
            </Button>
            <Button
              variant="primary"
              icon={<RefreshCw size={16} />}
              onClick={fetchEventSummary}
              className="bg-accent hover:bg-accent-dark text-accent-foreground transition-all duration-200 transform hover:scale-105"
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-primary rounded-lg shadow-lg shadow-black/10 p-6 animate-slide-in" style={{ animationDelay: "100ms" }}>
          <div className="flex justify-between">
            <div>
              <p className="text-primary-foreground/70 mb-1">Total Feedback</p>
              <h3 className="text-2xl font-bold text-primary-foreground">{summary.overview.totalFeedback}</h3>
            </div>
            <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center">
              <MessageCircle size={24} className="text-accent" />
            </div>
          </div>
        </div>

        <div className="bg-primary rounded-lg shadow-lg shadow-black/10 p-6 animate-slide-in" style={{ animationDelay: "200ms" }}>
          <div className="flex justify-between">
            <div>
              <p className="text-primary-foreground/70 mb-1">Active Alerts</p>
              <h3 className="text-2xl font-bold text-primary-foreground">{summary.alerts.active}</h3>
            </div>
            <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center">
              <Activity size={24} className="text-accent" />
            </div>
          </div>
        </div>

        <div className="bg-primary rounded-lg shadow-lg shadow-black/10 p-6 animate-slide-in" style={{ animationDelay: "300ms" }}>
          <div className="flex justify-between">
            <div>
              <p className="text-primary-foreground/70 mb-1">Resolution Rate</p>
              <h3 className="text-2xl font-bold text-primary-foreground">
                {summary.alerts.total > 0 ? Math.round((summary.alerts.resolved / summary.alerts.total) * 100) : 0}%
              </h3>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <TrendingUp size={24} className="text-accent" />
            </div>
          </div>
        </div>

        <div className="bg-primary rounded-lg shadow-lg shadow-black/10 p-6 animate-slide-in" style={{ animationDelay: "400ms" }}>
          <div className="flex justify-between">
            <div>
              <p className="text-primary-foreground/70 mb-1">Event Days</p>
              <h3 className="text-2xl font-bold text-primary-foreground">
                {Math.ceil((new Date(selectedEvent.endDate) - new Date(selectedEvent.startDate)) / (1000 * 60 * 60 * 24)) + 1}
              </h3>
            </div>
            <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Calendar size={24} className="text-accent" />
            </div>
          </div>
        </div>
      </div>

      {/* Sentiment Overview */}
      <div className="bg-primary rounded-lg shadow-lg shadow-black/10 p-6 mb-6 animate-slide-in" style={{ animationDelay: "500ms" }}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-primary-foreground">Sentiment Overview</h2>
          <div className="flex space-x-2">
            {['hour', 'day', 'week'].map((tf) => (
              <button
                key={tf}
                className={`px-3 py-1 rounded transition-colors duration-200 ${
                  selectedTimeframe === tf 
                    ? 'bg-accent text-accent-foreground' 
                    : 'bg-primary-light text-primary-foreground/70 hover:text-primary-foreground'
                }`}
                onClick={() => setSelectedTimeframe(tf)}
              >
                {tf.charAt(0).toUpperCase() + tf.slice(1)}ly
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SentimentChart 
              eventId={selectedEvent._id || selectedEvent.id}
              timeframe={selectedTimeframe}
              height={300}
            />
          </div>
          <div className="space-y-4">
            {['positive', 'neutral', 'negative'].map(sentiment => 
              renderSentimentBox(
                sentiment,
                summary.overview.sentimentBreakdown[sentiment].count,
                summary.overview.sentimentBreakdown[sentiment].percentage.toFixed(1)
              )
            )}
          </div>
        </div>
      </div>

      {/* Add similar styling for other sections */}
    </div>
  );
};

const Analytics = () => {
  const { selectedEvent } = useContext(EventContext);
  
  if (!selectedEvent) {
    return (
      <div className="flex flex-col items-center justify-center h-96 animate-fade-in">
        <BarChart2 size={48} className="mb-4 text-accent" />
        <h3 className="text-xl mb-4 text-primary-foreground">No event selected</h3>
        <Button
          variant="primary"
          className="bg-accent hover:bg-accent-dark text-accent-foreground transition-colors duration-200"
          onClick={() => window.location.href = '/events'}
        >
          Go to Events
        </Button>
      </div>
    );
  }
  
  return <AnalyticsDashboard />;
};

export default Analytics;