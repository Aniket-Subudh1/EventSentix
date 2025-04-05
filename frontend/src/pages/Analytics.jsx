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
  PieChart,
  Calendar,
  Download,
  Map,
  MessageCircle,
  Cloud,
  Activity,
  TrendingUp,
  Filter,
  RefreshCw
} from 'react-feather';

const AnalyticsDashboard = () => {
  const { selectedEvent: contextEvent, events } = useContext(EventContext);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('day');
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [showWordCloud, setShowWordCloud] = useState(false);
  const [wordCloudData, setWordCloudData] = useState([]);
  const [wordCloudLoading, setWordCloudLoading] = useState(false);
  
  const location = useLocation();
  const { eventId } = useParams();
  const eventFromState = location.state?.event;

  const selectedEvent = eventFromState || 
  (eventId && events.find(e => e.id === eventId || e._id === eventId)) || 
  contextEvent;


  
  const fetchEventSummary = useCallback(async () => {
    
    const effectiveEventId = selectedEvent?._id || selectedEvent?.id; // Support _id or id
    if (!effectiveEventId) {
      setError('Cannot fetch summary: Event ID is undefined');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('Fetching summary for event ID:', effectiveEventId);
      const data = await analyticsService.getEventSummary(effectiveEventId);
      console.log('API Response:', data);
      setSummary(data);
    } catch (err) {
      console.error('Error fetching event summary:', err);
      setError('Failed to load analytics data: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }, [selectedEvent]); // Depend on selectedEvent object

  useEffect(() => {
    console.log('Event from State:', eventFromState);
    console.log('Event ID from URL:', eventId);
    console.log('Selected Event:', selectedEvent);
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
      const format = 'csv'; // or 'json'
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
      console.error('Error exporting data:', err);
      setError('Failed to export data. Please try again.');
    }
  };
  
  const fetchWordCloud = async () => {
    try {
      setWordCloudLoading(true);
      const data = await analyticsService.getWordCloudData(selectedEvent.id, {
        limit: 100
      });
      setWordCloudData(data.words);
      setShowWordCloud(true);
    } catch (err) {
      console.error('Error fetching word cloud data:', err);
      setError('Failed to load word cloud data. Please try again.');
    } finally {
      setWordCloudLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader size="lg" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-md bg-red-50 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
        
        <Button
          onClick={fetchEventSummary}
          variant="primary"
          icon={<RefreshCw size={16} className="mr-2" />}
        >
          Retry
        </Button>
      </div>
    );
  }
  
  if (!summary) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          No analytics data available for this event.
        </div>
      </div>
    );
  }
  
  // Helper function to render sentiment counts in the overview section
  const renderSentimentBox = (sentiment, count, percentage) => {
    const colorClasses = {
      positive: 'bg-green-100 text-green-800',
      neutral: 'bg-gray-100 text-gray-800',
      negative: 'bg-red-100 text-red-800'
    };
    
    const icons = {
      positive: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
        </svg>
      ),
      neutral: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
        </svg>
      ),
      negative: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
        </svg>
      )
    };
    
    return (
      <div className={`p-4 rounded-lg ${colorClasses[sentiment]}`}>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {icons[sentiment]}
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium capitalize">{sentiment}</p>
            <p className="text-lg font-bold">{count}</p>
            <p className="text-sm">{percentage}%</p>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Analytics</h1>
        
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            onClick={handleExportData}
            icon={<Download size={16} className="mr-2" />}
          >
            Export Data
          </Button>
          
          <Button
            variant="primary"
            onClick={fetchEventSummary}
            icon={<RefreshCw size={16} className="mr-2" />}
          >
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card className="bg-white">
          <div className="flex items-center">
            <div className="p-3 rounded-md bg-blue-100 text-blue-600 mr-4">
              <MessageCircle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-medium">Total Feedback</h3>
              <p className="text-2xl font-bold">{summary.overview.totalFeedback}</p>
            </div>
          </div>
        </Card>
        
        <Card className="bg-white">
          <div className="flex items-center">
            <div className="p-3 rounded-md bg-orange-100 text-orange-600 mr-4">
              <Activity size={24} />
            </div>
            <div>
              <h3 className="text-lg font-medium">Active Alerts</h3>
              <p className="text-2xl font-bold">{summary.alerts.active}</p>
            </div>
          </div>
        </Card>
        
        <Card className="bg-white">
          <div className="flex items-center">
            <div className="p-3 rounded-md bg-green-100 text-green-600 mr-4">
              <TrendingUp size={24} />
            </div>
            <div>
              <h3 className="text-lg font-medium">Resolution Rate</h3>
              <p className="text-2xl font-bold">
                {summary.alerts.total > 0 ? Math.round((summary.alerts.resolved / summary.alerts.total) * 100) : 0}%
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="bg-white">
          <div className="flex items-center">
            <div className="p-3 rounded-md bg-purple-100 text-purple-600 mr-4">
              <Calendar size={24} />
            </div>
            <div>
              <h3 className="text-lg font-medium">Event Days</h3>
              <p className="text-2xl font-bold">
                {Math.ceil((new Date(selectedEvent.endDate) - new Date(selectedEvent.startDate)) / (1000 * 60 * 60 * 24)) + 1}
              </p>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Sentiment Overview */}
      <Card className="mb-6">
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-lg font-medium">Sentiment Overview</h2>
          
          <div className="flex space-x-2">
            <Button
              variant={selectedTimeframe === 'hour' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedTimeframe('hour')}
            >
              Hourly
            </Button>
            
            <Button
              variant={selectedTimeframe === 'day' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedTimeframe('day')}
            >
              Daily
            </Button>
            
            <Button
              variant={selectedTimeframe === 'week' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedTimeframe('week')}
            >
              Weekly
            </Button>
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
            <h3 className="text-sm font-medium text-gray-700">Sentiment Distribution</h3>
            
            {renderSentimentBox(
              'positive',
              summary.overview.sentimentBreakdown.positive.count,
              summary.overview.sentimentBreakdown.positive.percentage.toFixed(1)
            )}
            
            {renderSentimentBox(
              'neutral',
              summary.overview.sentimentBreakdown.neutral.count,
              summary.overview.sentimentBreakdown.neutral.percentage.toFixed(1)
            )}
            
            {renderSentimentBox(
              'negative',
              summary.overview.sentimentBreakdown.negative.count,
              summary.overview.sentimentBreakdown.negative.percentage.toFixed(1)
            )}
          </div>
        </div>
      </Card>
      
      {/* Top Issues and Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <h2 className="text-lg font-medium mb-4">Top Issues</h2>
          
          {summary.overview.topIssues && summary.overview.topIssues.length > 0 ? (
            <div className="space-y-4">
              {summary.overview.topIssues.map((issue, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-full">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium capitalize">{issue.issue}</span>
                      <span className="text-sm text-gray-500">{issue.count}</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full">
                      <div 
                        className="h-2 bg-red-500 rounded-full" 
                        style={{ width: `${issue.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-4">
              No issue data available
            </div>
          )}
        </Card>
        
        <Card>
          <h2 className="text-lg font-medium mb-4">Feedback Sources</h2>
          
          {summary.overview.topSources && summary.overview.topSources.length > 0 ? (
            <div className="space-y-4">
              {summary.overview.topSources.map((source, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-full">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium capitalize">{source.source}</span>
                      <span className="text-sm text-gray-500">{source.count}</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full">
                      <div 
                        className="h-2 bg-blue-500 rounded-full" 
                        style={{ width: `${source.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-4">
              No source data available
            </div>
          )}
        </Card>
      </div>
      
      {/* Trending Topics */}
      <Card className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">Trending Topics</h2>
          
          {!showWordCloud && (
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchWordCloud}
              disabled={wordCloudLoading}
            >
              {wordCloudLoading ? (
                <>
                  <Loader size="sm" className="mr-2" />
                  Loading...
                </>
              ) : (
                <>
                  <Cloud size={16} className="mr-2" />
                  Show Word Cloud
                </>
              )}
            </Button>
          )}
        </div>
        
        {showWordCloud && wordCloudData.length > 0 ? (
          <div className="bg-gray-50 p-4 rounded-lg min-h-40 flex flex-wrap gap-2 items-center justify-center">
            {wordCloudData.map((word, index) => {
              const fontSize = Math.max(14, Math.min(36, 14 + (word.value / 2)));
              const color = word.sentiment === 'positive' ? 'text-green-600' : 
                           word.sentiment === 'negative' ? 'text-red-600' : 'text-gray-600';
              
              return (
                <span 
                  key={index} 
                  className={`inline-block ${color} cursor-pointer hover:opacity-80 transition-opacity`}
                  style={{ fontSize: `${fontSize}px` }}
                  title={`${word.text} (${word.value} mentions)`}
                >
                  {word.text}
                </span>
              );
            })}
          </div>
        ) : summary.trends.topics && summary.trends.topics.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {summary.trends.topics.map((topic, index) => {
              const bgColor = topic.sentiment === 'positive' ? 'bg-green-100 text-green-800' : 
                             topic.sentiment === 'negative' ? 'bg-red-100 text-red-800' : 
                             'bg-blue-100 text-blue-800';
              
              return (
                <div 
                  key={index} 
                  className={`px-3 py-2 rounded-full ${bgColor} text-sm flex items-center`}
                >
                  <span className="font-medium">{topic.keyword}</span>
                  <span className="ml-2 bg-white bg-opacity-30 px-1.5 py-0.5 rounded-full text-xs">
                    {topic.count}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-4">
            No trending topics available
          </div>
        )}
      </Card>
      
      {/* Insights */}
      <Card>
        <h2 className="text-lg font-medium mb-4">Key Insights</h2>
        
        {summary.insights && summary.insights.length > 0 ? (
          <div className="space-y-4">
            {summary.insights.map((insight, index) => {
              const bgColor = insight.type === 'positive' ? 'bg-green-50 border-green-200' : 
                              insight.type === 'negative' ? 'bg-red-50 border-red-200' : 
                              insight.type === 'warning' ? 'bg-yellow-50 border-yellow-200' : 
                              'bg-blue-50 border-blue-200';
              
              const textColor = insight.type === 'positive' ? 'text-green-800' : 
                               insight.type === 'negative' ? 'text-red-800' : 
                               insight.type === 'warning' ? 'text-yellow-800' : 
                               'text-blue-800';
              
              return (
                <div key={index} className={`p-4 rounded-md border ${bgColor}`}>
                  <h3 className={`font-medium ${textColor}`}>{insight.title}</h3>
                  <p className="mt-1 text-sm">{insight.description}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-4">
            No insights available yet. More data is needed for meaningful insights.
          </div>
        )}
      </Card>
    </div>
  );
};

const Analytics = () => {
  const { selectedEvent } = useContext(EventContext);
  
  if (!selectedEvent) {
    return (
      <div className="flex h-64 flex-col items-center justify-center p-6">
        <BarChart2 size={48} className="mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900">No event selected</h3>
        <p className="mt-1 text-sm text-gray-500">
          Please select an event to view analytics.
        </p>
        <Button
          variant="primary"
          className="mt-4"
          onClick={() => window.location.href = '/events'}
        >
          Go to Events
        </Button>
      </div>
    );
  }
  
  return <AnalyticsDashboard selectedEvent={selectedEvent} />;
};

export default Analytics;