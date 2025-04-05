import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import analyticsService from '../../services/analyticsService';
import { Loader } from '../common/Loader';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border rounded shadow-lg">
        <p className="font-semibold capitalize">{label}</p>
        <div className="mt-2">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between mb-1">
              <span className="flex-1" style={{ color: entry.color }}>
                {entry.name}:
              </span>
              <span className="font-medium">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  return null;
};

const IssueChart = ({ eventId, height = 300 }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState([]);
  
  useEffect(() => {
    const fetchIssueData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch issue breakdown data
        const data = await analyticsService.getIssueBreakdown(eventId);
        
        // Format data for the chart
        const formattedData = data.map(issue => ({
          name: issue.type,
          count: issue.count,
          locations: issue.locations
        }));
        
        setChartData(formattedData);
      } catch (err) {
        console.error('Error fetching issue data:', err);
        setError('Failed to load issue data');
      } finally {
        setLoading(false);
      }
    };
    
    if (eventId) {
      fetchIssueData();
    }
  }, [eventId]);
  
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
        <p>No issue data available</p>
      </div>
    );
  }
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
        <XAxis 
          dataKey="name" 
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar 
          dataKey="count" 
          name="Issues" 
          fill="#EF4444" 
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default IssueChart;