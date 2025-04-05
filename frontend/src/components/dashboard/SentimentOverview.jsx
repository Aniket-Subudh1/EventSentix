import React from 'react';
import { Smile, Meh, Frown } from 'react-feather';

const SentimentOverview = ({ sentimentData, className }) => {
  console.log('Sentiment Overview - Raw Data:', sentimentData);

  const safeData = sentimentData || {
    positive: 0,
    neutral: 0,
    negative: 0
  };

  const total = safeData.positive + safeData.neutral + safeData.negative;
  
  const positivePercent = total > 0 
    ? Math.round((safeData.positive / total) * 100) 
    : 0;
  const neutralPercent = total > 0 
    ? Math.round((safeData.neutral / total) * 100) 
    : 0;
  const negativePercent = total > 0 
    ? Math.round((safeData.negative / total) * 100) 
    : 0;
  return (
    <div className={className}>
      <h3 className="text-lg font-semibold text-white mb-4">Sentiment Overview</h3>
      {/* Progress Bars */}
      <div className="mb-6">
        <div className="flex h-4 mb-2 bg-gray-700 rounded overflow-hidden">
          <div 
            className="bg-green-500 transition-all duration-500 ease-in-out" 
            style={{ width: `${positivePercent}%` }}
          ></div>
          <div 
            className="bg-gray-500 transition-all duration-500 ease-in-out" 
            style={{ width: `${neutralPercent}%` }}
          ></div>
          <div 
            className="bg-red-500 transition-all duration-500 ease-in-out" 
            style={{ width: `${negativePercent}%` }}
          ></div>
        </div>
        <div className="flex text-xs text-gray-400 justify-between">
          <span>{total} total feedback</span>
          <span>{positivePercent}% positive</span>
        </div>
      </div>
      
      {/* Sentiment Breakdown */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-4 bg-green-900/20 rounded-lg">
          <div className="flex items-center mb-2">
            <Smile className="text-green-300 mr-2" size={20} />
            <h4 className="font-medium text-green-300">Positive</h4>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-green-300">{sentimentData.positive}</span>
            <span className="text-sm text-white">{positivePercent}%</span>
          </div>
        </div>
        
        <div className="p-4 bg-gray-900/20 rounded-lg">
          <div className="flex items-center mb-2">
            <Meh className="text-gray-300 mr-2" size={20} />
            <h4 className="font-medium text-gray-300">Neutral</h4>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-gray-300">{sentimentData.neutral}</span>
            <span className="text-sm text-white">{neutralPercent}%</span>
          </div>
        </div>
        
        <div className="p-4 bg-red-900/20 rounded-lg">
          <div className="flex items-center mb-2">
            <Frown className="text-red-300 mr-2" size={20} />
            <h4 className="font-medium text-red-300">Negative</h4>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-red-300">{sentimentData.negative}</span>
            <span className="text-sm text-white">{negativePercent}%</span>
          </div>
        </div>
      </div>
      
      {/* Sentiment Indicators */}
      <div className="mt-4">
        {positivePercent >= 70 && (
          <div className="p-2 bg-green-900/20 text-green-300 rounded-lg flex items-center">
            <Smile className="mr-2" size={16} />
            <span>Overall sentiment is very positive!</span>
          </div>
        )}
        
        {negativePercent >= 30 && (
          <div className="p-2 bg-red-900/20 text-red-300 rounded-lg flex items-center mt-2">
            <Frown className="mr-2" size={16} />
            <span>High negative sentiment detected - check alerts.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SentimentOverview;
