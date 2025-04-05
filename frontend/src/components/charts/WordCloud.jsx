import React, { useState, useEffect } from 'react';
import analyticsService from '../../services/analyticsService';
import { Loader } from '../common/Loader';
import { Cloud, Filter } from 'react-feather';

const WordCloudItem = ({ word, index, maxValue }) => {
  // Calculate size based on value relative to max
  const calculateSize = (value, max) => {
    const minSize = 14;
    const maxSize = 32;
    const ratio = value / (max || 1);
    return Math.max(minSize, Math.min(maxSize, minSize + (maxSize - minSize) * ratio));
  };
  
  // Get color based on sentiment
  const getColor = (sentiment) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600';
      case 'negative':
        return 'text-red-600';
      case 'neutral':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };
  
  const fontSize = calculateSize(word.value, maxValue);
  const colorClass = getColor(word.sentiment);
  
  return (
    <span 
      className={`inline-block ${colorClass} cursor-pointer hover:opacity-80 transition-opacity px-1`}
      style={{ fontSize: `${fontSize}px` }}
      title={`${word.text} (${word.value} mentions)`}
    >
      {word.text}
    </span>
  );
};

const WordCloud = ({ eventId, height = 300, maxWords = 100, sentiment = 'all' }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [words, setWords] = useState([]);
  const [filter, setFilter] = useState(sentiment);
  
  useEffect(() => {
    const fetchWordCloudData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch word cloud data
        const params = {
          limit: 500,
          maxWords,
          sentiment: filter !== 'all' ? filter : undefined
        };
        
        const data = await analyticsService.getWordCloudData(eventId, params);
        setWords(data.words || []);
      } catch (err) {
        console.error('Error fetching word cloud data:', err);
        setError('Failed to load word cloud data');
      } finally {
        setLoading(false);
      }
    };
    
    if (eventId) {
      fetchWordCloudData();
    }
  }, [eventId, maxWords, filter]);
  
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
  
  if (words.length === 0) {
    return (
      <div className="text-gray-500 h-48 flex items-center justify-center">
        <p>No word cloud data available</p>
      </div>
    );
  }
  
  // Find maximum value for size scaling
  const maxValue = Math.max(...words.map(word => word.value));
  
  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center">
          <Cloud className="mr-2 text-blue-500" size={20} />
          <h3 className="text-lg font-medium">Word Cloud</h3>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500 mr-1">Filter:</span>
          <select 
            className="text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
          </select>
        </div>
      </div>
      
      <div 
        className={`bg-gray-50 p-4 rounded-lg flex flex-wrap gap-2 justify-center items-center overflow-hidden`}
        style={{ height: `${height}px` }}
      >
        {words.map((word, index) => (
          <WordCloudItem 
            key={index}
            word={word}
            index={index}
            maxValue={maxValue}
          />
        ))}
      </div>
      
      <div className="mt-2 flex justify-end">
        <div className="flex text-xs text-gray-500 space-x-4">
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-green-600 mr-1"></span>
            <span>Positive</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-blue-600 mr-1"></span>
            <span>Neutral</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-red-600 mr-1"></span>
            <span>Negative</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WordCloud;