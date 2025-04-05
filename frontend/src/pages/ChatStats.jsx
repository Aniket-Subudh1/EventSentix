import React, { useState, useEffect, useContext } from 'react';
import { EventContext } from '../context/EventContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Loader } from '../components/common/Loader';
import chatService from '../services/chatService'; 
import {
  MessageCircle,
  Smile,
  Meh,
  Frown,
  Users,
  RefreshCw
} from 'react-feather';

const SentimentPieChart = ({ sentimentData }) => {
  const total = Object.values(sentimentData).reduce((a, b) => a + b, 0);
  
  return (
    <div className="relative w-full h-48">
      <svg viewBox="0 0 36 36" className="w-full h-full">
        {[
          { color: 'green', sentiment: 'positive', value: sentimentData.positive },
          { color: 'gray', sentiment: 'neutral', value: sentimentData.neutral },
          { color: 'red', sentiment: 'negative', value: sentimentData.negative }
        ].reduce((acc, { color, sentiment, value }) => {
          const percentage = (value / total) * 100;
          const startAngle = acc.endAngle;
          const endAngle = startAngle + (percentage * 3.6);
          
          return {
            ...acc,
            segments: [
              ...acc.segments,
              (
                <path
                  key={sentiment}
                  d={describeArc(18, 18, 16, startAngle, endAngle)}
                  fill="none"
                  stroke={`${color}`}
                  strokeWidth="3"
                  className="opacity-60 hover:opacity-80 transition"
                />
              )
            ],
            endAngle
          };
        }, { segments: [], endAngle: 0 }).segments}
      </svg>
      
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold">{total}</div>
          <div className="text-xs text-gray-500">Total Messages</div>
        </div>
      </div>
      
      <div className="flex justify-center space-x-4 mt-4">
        {[
          { icon: Smile, color: 'text-green-500', sentiment: 'positive', count: sentimentData.positive },
          { icon: Meh, color: 'text-gray-500', sentiment: 'neutral', count: sentimentData.neutral },
          { icon: Frown, color: 'text-red-500', sentiment: 'negative', count: sentimentData.negative }
        ].map(({ icon: Icon, color, sentiment, count }) => (
          <div key={sentiment} className="flex items-center">
            <Icon className={`${color} mr-2`} size={16} />
            <span className="text-sm">{count} {sentiment}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Helper function to draw SVG arc
function describeArc(x, y, radius, startAngle, endAngle) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  
  return [
    "M", start.x, start.y, 
    "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
  ].join(" ");
}

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = (angleInDegrees-90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
}

const ChatStats = () => {
  const { selectedEvent } = useContext(EventContext);
  const [chatStats, setChatStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchChatStats = async () => {
    if (!selectedEvent) return;

    try {
      setLoading(true);
      const stats = await chatService.getChatStats(selectedEvent._id);
      setChatStats(stats);
      setError(null);
    } catch (err) {
      console.error('Error fetching chat stats:', err);
      setError('Failed to load chat statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEvent) {
      fetchChatStats();
    }
  }, [selectedEvent]);

  if (!selectedEvent) {
    return (
      <div className="flex h-64 flex-col items-center justify-center p-6">
        <MessageCircle size={48} className="mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900">No event selected</h3>
        <p className="mt-1 text-sm text-gray-500">
          Please select an event to view chat statistics.
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-800 p-4 rounded-md mb-4">
          {error}
        </div>
        <Button 
          variant="primary" 
          onClick={fetchChatStats}
          icon={<RefreshCw size={16} className="mr-2" />}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Chat Statistics</h1>
        <Button
          variant="secondary"
          onClick={fetchChatStats}
          icon={<RefreshCw size={16} className="mr-2" />}
        >
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Messages Card */}
        <Card>
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 mr-4">
              <MessageCircle size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Messages</p>
              <h3 className="text-2xl font-bold">{chatStats?.total || 0}</h3>
            </div>
          </div>
        </Card>

        {/* User Count Card */}
        <Card>
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 mr-4">
              <Users size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Unique Users</p>
              <h3 className="text-2xl font-bold">{chatStats?.userCount || 0}</h3>
            </div>
          </div>
        </Card>

        {/* Sentiment Summary Card */}
        <Card>
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 mr-4">
              <Smile size={24} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Sentiment Summary</p>
              <div className="flex space-x-2 mt-1">
                <span className="text-green-600">
                  <Smile size={16} className="inline mr-1" />
                  {chatStats?.sentiment?.positive || 0}
                </span>
                <span className="text-gray-600">
                  <Meh size={16} className="inline mr-1" />
                  {chatStats?.sentiment?.neutral || 0}
                </span>
                <span className="text-red-600">
                  <Frown size={16} className="inline mr-1" />
                  {chatStats?.sentiment?.negative || 0}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Sentiment Distribution */}
      <Card className="mt-6">
        <h2 className="text-lg font-medium mb-4">Sentiment Distribution</h2>
        <SentimentPieChart 
          sentimentData={{
            positive: chatStats?.sentiment?.positive || 0,
            neutral: chatStats?.sentiment?.neutral || 0,
            negative: chatStats?.sentiment?.negative || 0
          }} 
        />
      </Card>

      {/* Latest Messages */}
      <Card className="mt-6">
        <h2 className="text-lg font-medium mb-4">Recent Messages</h2>
        {/* You could add a component to display recent messages here */}
        <div className="text-center text-gray-500">
          Recent messages feature coming soon
        </div>
      </Card>
    </div>
  );
};

export default ChatStats;