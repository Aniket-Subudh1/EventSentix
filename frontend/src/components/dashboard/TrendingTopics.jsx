import React from 'react';
import { TrendingUp, Smile, Meh, Frown } from 'react-feather';

const getSentimentIcon = (sentiment) => {
  switch (sentiment) {
    case 'positive':
      return <Smile className="text-green-500" size={14} />;
    case 'neutral':
      return <Meh className="text-gray-500" size={14} />;
    case 'negative':
      return <Frown className="text-red-500" size={14} />;
    default:
      return null;
  }
};

const getSentimentColorClass = (sentiment) => {
  switch (sentiment) {
    case 'positive':
      return 'text-green-500 bg-green-100 border-green-300';
    case 'neutral':
      return 'text-gray-600 bg-gray-100 border-gray-300';
    case 'negative':
      return 'text-red-500 bg-red-100 border-red-300';
    default:
      return 'text-blue-500 bg-blue-100 border-blue-300';
  }
};

const TopicItem = ({ topic, index }) => {
  // Calculate size class based on count or score
  const getTopicSizeClass = (index) => {
    switch (index) {
      case 0:
        return 'text-lg font-semibold';
      case 1:
      case 2:
        return 'text-base';
      default:
        return 'text-sm';
    }
  };

  return (
    <div className={`inline-flex items-center px-3 py-1 m-1 rounded-full border ${getSentimentColorClass(topic.sentiment)}`}>
      <span className={getTopicSizeClass(index)}>{topic.keyword}</span>
      {topic.sentiment && (
        <span className="ml-1">
          {getSentimentIcon(topic.sentiment)}
        </span>
      )}
      <span className="ml-1 text-xs opacity-70">({topic.count})</span>
    </div>
  );
};

const TrendingTopics = ({ topics = [], className }) => {
  if (!topics || topics.length === 0) {
    return (
      <div className={className}>
        <div className="flex items-center mb-4">
          <TrendingUp className="text-blue-500 mr-2" size={20} />
          <h3 className="text-lg font-semibold">Trending Topics</h3>
        </div>
        <div className="text-center p-6">
          <div className="flex justify-center mb-2">
            <TrendingUp className="text-gray-400" size={24} />
          </div>
          <p className="text-gray-500">No trending topics available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <TrendingUp className="text-blue-500 mr-2" size={20} />
          <h3 className="text-lg font-semibold">Trending Topics</h3>
        </div>
        <span className="text-xs text-gray-500">Past 60 minutes</span>
      </div>
      
      <div className="flex flex-wrap">
        {topics.map((topic, index) => (
          <TopicItem 
            key={`${topic.keyword}-${index}`}
            topic={topic}
            index={index}
          />
        ))}
      </div>
      
      {topics.length > 0 && topics[0].sentiment === 'negative' && (
        <div className="mt-4 p-2 bg-red-50 text-red-700 rounded text-sm">
          <div className="flex items-center">
            <Frown className="mr-2" size={16} />
            <span>Top trending topic has negative sentiment - may require attention.</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrendingTopics;