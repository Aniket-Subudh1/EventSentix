import React from 'react';
import { Smile, Meh, Frown, Clock, Twitter, Instagram, Linkedin, MessageCircle, ExternalLink, MapPin } from 'react-feather';

const FeedbackTable = ({ 
  feedback, 
  onViewDetails, 
  onUpdate,
  onDelete,
  onBatchProcess,
  selectedFeedback,
  setSelectedFeedback
}) => {
  // Get sentiment icon based on sentiment
  const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
      case 'positive':
        return <Smile className="text-green-500" size={18} />;
      case 'negative':
        return <Frown className="text-red-500" size={18} />;
      case 'neutral':
      default:
        return <Meh className="text-gray-500" size={18} />;
    }
  };
  
  // Get source icon based on source
  const getSourceIcon = (source) => {
    switch (source) {
      case 'twitter':
        return <Twitter size={16} className="text-blue-400" />;
      case 'instagram':
        return <Instagram size={16} className="text-purple-500" />;
      case 'linkedin':
        return <Linkedin size={16} className="text-blue-700" />;
      case 'direct':
        return <MessageCircle size={16} className="text-green-500" />;
      case 'survey':
        return <MessageCircle size={16} className="text-orange-500" />;
      default:
        return <MessageCircle size={16} className="text-gray-500" />;
    }
  };
  
  // Format date to relative time
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
  
  // Handle selection of feedback items for batch processing
  const handleSelectFeedback = (id) => {
    if (selectedFeedback.includes(id)) {
      setSelectedFeedback(selectedFeedback.filter(item => item !== id));
    } else {
      setSelectedFeedback([...selectedFeedback, id]);
    }
  };
  
  // Handle select all
  const handleSelectAll = () => {
    if (selectedFeedback.length === feedback.length) {
      setSelectedFeedback([]);
    } else {
      setSelectedFeedback(feedback.map(item => item._id));
    }
  };
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {setSelectedFeedback && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={selectedFeedback.length === feedback.length && feedback.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
            )}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Sentiment
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Feedback
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Source
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Location
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Time
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        
        <tbody className="bg-white divide-y divide-gray-200">
          {feedback.length === 0 ? (
            <tr>
              <td colSpan={setSelectedFeedback ? "7" : "6"} className="px-6 py-4 text-center text-sm text-gray-500">
                No feedback found
              </td>
            </tr>
          ) : (
            feedback.map((item) => (
              <tr key={item._id} className="hover:bg-gray-50">
                {setSelectedFeedback && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={selectedFeedback.includes(item._id)}
                      onChange={() => handleSelectFeedback(item._id)}
                    />
                  </td>
                )}
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getSentimentIcon(item.sentiment)}
                    <span className="ml-1 text-xs font-medium capitalize">{item.sentiment}</span>
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 line-clamp-2">{item.text}</div>
                  {item.issueType && (
                    <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {item.issueType}
                    </span>
                  )}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-500">
                    {getSourceIcon(item.source)}
                    <span className="ml-1 capitalize">{item.source}</span>
                  </div>
                  {item.metadata?.username && (
                    <div className="text-xs text-gray-400">
                      {item.metadata.username}
                    </div>
                  )}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  {item.issueDetails?.location ? (
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin size={14} className="mr-1" />
                      {item.issueDetails.location}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <Clock className="mr-1" size={14} />
                    {formatTime(item.createdAt)}
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => onViewDetails(item)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View
                    </button>
                    
                    {item.sourceId && (
                      <a 
                        href="#" 
                        className="text-purple-600 hover:text-purple-900"
                        title="View original"
                      >
                        <ExternalLink size={16} />
                      </a>
                    )}
                    
                    <button
                      onClick={() => onDelete(item._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default FeedbackTable;