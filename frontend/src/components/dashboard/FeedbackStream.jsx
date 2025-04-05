import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Smile, Meh, Frown, Twitter, Instagram, Linkedin, ExternalLink } from 'react-feather';

const getSentimentIcon = (sentiment) => {
  switch (sentiment) {
    case 'positive':
      return <Smile className="text-green-300" size={16} />;
    case 'neutral':
      return <Meh className="text-gray-300" size={16} />;
    case 'negative':
      return <Frown className="text-red-300" size={16} />;
    default:
      return <Meh className="text-gray-300" size={16} />;
  }
};

const getSentimentClass = (sentiment) => {
  switch (sentiment) {
    case 'positive':
      return 'bg-green-900/20 border-green-700';
    case 'neutral':
      return 'bg-gray-900/20 border-gray-700';
    case 'negative':
      return 'bg-red-900/20 border-red-700';
    default:
      return 'bg-gray-900/20 border-gray-700';
  }
};

const getSourceIcon = (source) => {
  switch (source) {
    case 'twitter':
      return <Twitter size={14} className="text-blue-400" />;
    case 'instagram':
      return <Instagram size={14} className="text-purple-500" />;
    case 'linkedin':
      return <Linkedin size={14} className="text-blue-700" />;
    default:
      return <MessageCircle size={14} className="text-gray-300" />;
  }
};

const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.round(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  return date.toLocaleDateString();
};

const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

const FeedbackItem = ({ feedback }) => {
  return (
    <div className={`p-3 border rounded mb-3 ${getSentimentClass(feedback.sentiment)}`}>
      <div className="flex justify-between items-start">
        <div className="flex items-start">
          {getSentimentIcon(feedback.sentiment)}
          <div className="ml-2">
            <p className="text-sm text-gray-300">{truncateText(feedback.text)}</p>
            {feedback.issueType && (
              <span className="inline-block mt-1 px-2 py-0.5 bg-gray-800 text-gray-300 text-xs rounded-full">
                {feedback.issueType}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
        <div className="flex items-center space-x-2">
          <span className="flex items-center">
            {getSourceIcon(feedback.source)}
            <span className="ml-1 capitalize">{feedback.source}</span>
          </span>
          {feedback.metadata?.username && (
            <span>by {feedback.metadata.username}</span>
          )}
        </div>
        <div className="flex items-center">
          <span>{formatTime(feedback.createdAt)}</span>
          {feedback.sourceId && (
            <a 
              href={`#`} 
              className="ml-2"
              title="View original"
            >
              <ExternalLink size={12} className="text-gray-300" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

const FeedbackStream = ({ feedback = [], className }) => {
  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <MessageCircle className="text-blue-400 mr-2" size={20} />
          <h3 className="text-lg font-semibold text-white">Live Feedback</h3>
        </div>
        <Link 
          to="/feedback" 
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          View All
        </Link>
      </div>
      
      {feedback.length === 0 ? (
        <div className="text-center p-6">
          <div className="flex justify-center mb-2">
            <MessageCircle className="text-gray-500" size={24} />
          </div>
          <p className="text-gray-400">No feedback available</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {feedback.map((item) => (
            <FeedbackItem key={item._id} feedback={item} />
          ))}
        </div>
      )}
    </div>
  );
};

export default FeedbackStream;
