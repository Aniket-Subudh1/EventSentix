import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import analyticsService from '../../services/analyticsService';
import { Loader } from '../common/Loader';

const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  
  if (!timestamp) return '';
  
  // Format based on timeframe
  if (date.getHours() === 0 && date.getMinutes() === 0) {
    // Daily data
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } else {
    // Hourly data
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const total = data.positive + data.neutral + data.negative;
    
    return (
      <div className="bg-white p-3 border rounded shadow-lg">
        <p className="font-semibold">{formatDate(data.timestamp)}</p>
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-green-500 flex-1">Positive:</span>
            <span className="font-medium">{data.positive}</span>
            <span className="ml-2 text-xs">
              ({Math.round((data.positive / total) * 100)}%)
            </span>
          </div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-gray-500 flex-1">Neutral:</span>
            <span className="font-medium">{data.neutral}</span>
            <span className="ml-2 text-xs">
              ({Math.round((data.neutral / total) * 100)}%)
            </span>
          </div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-red-500 flex-1">Negative:</span>
            <span className="font-medium">{data.negative}</span>
            <span className="ml-2 text-xs">
              ({Math.round((data.negative / total) * 100)}%)
            </span>
          </div>
          <div className="pt-1 mt-1 border-t">
            <span className="font-semibold">Total: {total}</span>
          </div>
        </div>
      </div>
    );
  }
  
  return null;
};

const SentimentChart = ({ eventId, timeframe = 'day', height = 300 }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState([]);
  
  useEffect(() => {
    const fetchSentimentData = async () => {
      if (!eventId) {
        console.log('No event ID provided');
        setLoading(false);
        return;
      }else{
        console.log("Event id is provided")
      }
      try {
        setLoading(true);
        setError(null);
        const data = await analyticsService.getSentimentTrend(eventId, timeframe);
        const transformedData = data.timeline.map(item => ({
          timestamp: new Date(item.timestamp).getTime(), // Ensure timestamp is in milliseconds
          positive: item.positive.count,
          neutral: item.neutral.count,
          negative: item.negative.count,
        }));
        setChartData(transformedData);
      } catch (err) {
        console.error('Error fetching sentiment data:', err);
        setError('Failed to load sentiment data');
      } finally {
        setLoading(false);
      }
    };
    
    if (eventId) {
      fetchSentimentData();
    }
  }, [eventId, timeframe]);
  
  if (loading) {
    return <Loader className="h-48 flex items-center justify-center" />;
  }
  
  if (error) {
    return (
      <div className="text-red-500 h-48 flex items-center justify-center">
        <p>{error}</p>
      </div>
    );
  }
  
  if (chartData.length === 0) {
    return (
      <div className="text-gray-500 h-48 flex items-center justify-center">
        <p>No sentiment data available</p>
      </div>
    );
  }
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={chartData}
        margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
        <XAxis 
          dataKey="timestamp" 
          tickFormatter={formatDate} 
          tick={{ fontSize: 12 }}
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="positive"
          name="Positive" 
          stroke="#10B981" 
          strokeWidth={2}
          activeDot={{ r: 6 }}
        />
        <Line 
          type="monotone" 
          dataKey="neutral" 
          name="Neutral"
          stroke="#9CA3AF" 
          strokeWidth={2}
          activeDot={{ r: 6 }}
        />
        <Line 
          type="monotone" 
          dataKey="negative" 
          name="Negative"
          stroke="#EF4444" 
          strokeWidth={2}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default SentimentChart;