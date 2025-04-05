// src/components/dashboard/SentimentOverview.jsx
import React from 'react';
import { Smile, Meh, Frown } from 'react-feather';

const SentimentOverview = ({ sentimentData, className }) => {
  if (!sentimentData) {
    return (
      <div className={className}>
        <h3 className="text-lg font-semibold mb-4">Sentiment Overview</h3>
        <p className="text-gray-500">No sentiment data available</p>
      </div>
    );
  }

  const total = sentimentData.positive + sentimentData.neutral + sentimentData.negative;
  
  const positivePercent = total > 0 ? Math.round((sentimentData.positive / total) * 100) : 0;
  const neutralPercent = total > 0 ? Math.round((sentimentData.neutral / total) * 100) : 0;
  const negativePercent = total > 0 ? Math.round((sentimentData.negative / total) * 100) : 0;

  return (
    <div className={className}>
      <h3 className="text-lg font-semibold mb-4">Sentiment Overview</h3>
      
      {/* Progress bars */}
      <div className="mb-6">
        <div className="flex h-4 mb-2 bg-gray-200 rounded overflow-hidden">
          <div 
            className="bg-green-500 transition-all duration-500 ease-in-out" 
            style={{ width: `${positivePercent}%` }}
          ></div>
          <div 
            className="bg-gray-400 transition-all duration-500 ease-in-out" 
            style={{ width: `${neutralPercent}%` }}
          ></div>
          <div 
            className="bg-red-500 transition-all duration-500 ease-in-out" 
            style={{ width: `${negativePercent}%` }}
          ></div>
        </div>
        <div className="flex text-xs text-gray-600 justify-between">
          <span>{total} total feedback</span>
          <span>{positivePercent}% positive</span>
        </div>
      </div>
      
      {/* Sentiment breakdown */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-4 bg-green-50 rounded-lg">
          <div className="flex items-center mb-2">
            <Smile className="text-green-500 mr-2" size={20} />
            <h4 className="font-medium">Positive</h4>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-green-500">{sentimentData.positive}</span>
            <span className="text-sm text-gray-500">{positivePercent}%</span>
          </div>
        </div>
        
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center mb-2">
            <Meh className="text-gray-500 mr-2" size={20} />
            <h4 className="font-medium">Neutral</h4>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-gray-500">{sentimentData.neutral}</span>
            <span className="text-sm text-gray-500">{neutralPercent}%</span>
          </div>
        </div>
        
        <div className="p-4 bg-red-50 rounded-lg">
          <div className="flex items-center mb-2">
            <Frown className="text-red-500 mr-2" size={20} />
            <h4 className="font-medium">Negative</h4>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-red-500">{sentimentData.negative}</span>
            <span className="text-sm text-gray-500">{negativePercent}%</span>
          </div>
        </div>
      </div>
      
      {/* Sentiment indicators */}
      <div className="mt-4">
        {positivePercent >= 70 && (
          <div className="p-2 bg-green-100 text-green-800 rounded-lg flex items-center">
            <Smile className="mr-2" size={16} />
            <span>Overall sentiment is very positive!</span>
          </div>
        )}
        
        {negativePercent >= 30 && (
          <div className="p-2 bg-red-100 text-red-800 rounded-lg flex items-center">
            <Frown className="mr-2" size={16} />
            <span>High negative sentiment detected - check alerts.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SentimentOverview;