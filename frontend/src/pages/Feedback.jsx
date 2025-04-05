import React, { useState, useEffect, useContext, useCallback } from 'react';
import { EventContext } from '../context/EventContext';
import { SocketContext } from '../context/SocketContext';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Loader } from '../components/common/Loader';
import FeedbackTable from '../components/tables/FeedbackTable';
import FeedbackForm from '../components/forms/FeedbackForm';
import feedbackService from '../services/feedbackService';
import twitterService from '../services/twitterService'; 
import debounce from 'lodash/debounce';
import { 
  MessageCircle, 
  Filter, 
  RefreshCw, 
  Download, 
  Trash2, 
  CheckSquare, 
  Smile, 
  Meh, 
  Frown, 
  Calendar,
  Twitter
} from 'react-feather';

const Feedback = () => {
  const { selectedEvent } = useContext(EventContext);
  const { newFeedback } = useContext(SocketContext);
  
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewFeedback, setViewFeedback] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFeedbackFormOpen, setIsFeedbackFormOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState([]);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isSearchingTwitter, setIsSearchingTwitter] = useState(false);
  const [batchAction, setBatchAction] = useState({
    processed: true,
    issueType: '',
    resolved: false,
    severity: 'medium'
  });
  
  const [filters, setFilters] = useState({
    sentiment: '',
    source: '',
    issueType: '',
    startDate: '',
    endDate: '',
    search: ''
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
  });
  
  const debouncedFetchFeedback = useCallback(
    debounce(async (eventId, page, filters) => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await feedbackService.getEventFeedback(eventId, {
          page,
          limit: pagination.limit,
          ...filters
        });
        
        setFeedback(response.data);
        setPagination((prev) => ({
          ...prev,
          total: response.total,
          totalPages: response.pagination.totalPages
        }));
      } catch (err) {
        console.error('Error fetching feedback:', err);
        setError('Failed to load feedback data');
      } finally {
        setLoading(false);
      }
    }, 300),
    [pagination.limit]
  );

  useEffect(() => {
    if (selectedEvent && selectedEvent._id) {
      debouncedFetchFeedback(selectedEvent._id, pagination.page, filters);
    } else {
      console.log('No valid selectedEvent or event _id:', selectedEvent);
      setLoading(false);
      setError('No event selected or event ID is missing');
    }
  }, [selectedEvent, pagination.page, filters, debouncedFetchFeedback]);
  
  useEffect(() => {
    if (newFeedback && selectedEvent && newFeedback.event === selectedEvent._id) {
      setFeedback(prev => [newFeedback, ...prev]);
    }
  }, [newFeedback, selectedEvent]);
  
  const handleTwitterSearch = async () => {
    if (!selectedEvent?._id) {
      setError('No event selected for Twitter search');
      return;
    }

    const eventId = selectedEvent._id;
    const hashtag = selectedEvent.socialTracking?.hashtags?.[0] || '';

    if (!hashtag) {
      setError('No hashtags configured for this event');
      return;
    }

    try {
      setIsSearchingTwitter(true);
      setError(null);

      console.log('Initiating Twitter search for:', { eventId, hashtag });
      const response = await twitterService.searchTweets(eventId, hashtag);
      console.log('Twitter search response:', response);

      // Refresh feedback list after search
      debouncedFetchFeedback(eventId, pagination.page, filters);

      console.log(response.totalPosts > 0 
        ? `Found ${response.totalPosts} new tweets`
        : 'No new tweets found');
    } catch (err) {
      console.error('Twitter search error:', err);
      setError('Failed to search Twitter: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSearchingTwitter(false);
    }
  };

  const handleViewFeedback = (feedbackItem) => {
    setViewFeedback(feedbackItem);
    setIsModalOpen(true);
  };
  
  const handleDeleteFeedback = async (id) => {
    try {
      await feedbackService.deleteFeedback(id);
      setFeedback(prev => prev.filter(item => item._id !== id));
      setIsDeleteModalOpen(false);
    } catch (err) {
      console.error('Error deleting feedback:', err);
      setError('Failed to delete feedback');
    }
  };
  
  const handleBatchProcess = async () => {
    try {
      await feedbackService.batchProcessFeedback(selectedFeedback, batchAction);
      debouncedFetchFeedback(selectedEvent._id, pagination.page, filters);
      setSelectedFeedback([]);
      setIsBatchModalOpen(false);
    } catch (err) {
      console.error('Error batch processing feedback:', err);
      setError('Failed to process feedback');
    }
  };
  
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setPagination(prev => ({
      ...prev,
      page: 1
    }));
  };
  
  const clearFilters = () => {
    setFilters({
      sentiment: '',
      source: '',
      issueType: '',
      startDate: '',
      endDate: '',
      search: ''
    });
    setPagination(prev => ({
      ...prev,
      page: 1
    }));
  };
  
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({
        ...prev,
        page: newPage
      }));
    }
  };
  
  const exportFeedback = async () => {
    try {
      const data = await feedbackService.getEventFeedback(selectedEvent._id, {
        limit: 1000,
        ...filters
      });
      
      let csv = 'ID,Sentiment,Score,Source,Text,Issue Type,Location,Created At\n';
      data.data.forEach(item => {
        csv += `${item._id},${item.sentiment},${item.sentimentScore},${item.source},"${item.text.replace(/"/g, '""')}",${item.issueType || ''},${item.issueDetails?.location || ''},${new Date(item.createdAt).toISOString()}\n`;
      });
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `feedback_export_${new Date().toISOString()}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exporting feedback:', err);
      setError('Failed to export feedback');
    }
  };

  return (
    <div className="p-6 bg-[#00001A] min-h-screen">
      <div className="bg-white/5 backdrop-blur-lg rounded-xl shadow-xl p-6 mb-6 transform transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2 text-white bg-gradient-to-r from-[#9D174D] to-[#C53070] bg-clip-text text-transparent">
              Feedback Management
            </h1>
            {selectedEvent && (
              <div className="flex items-center text-gray-300">
                <Calendar size={16} className="mr-2 text-[#9D174D]" />
                {selectedEvent.name} - {selectedEvent.startDate && new Date(selectedEvent.startDate).toLocaleDateString()} to {selectedEvent.endDate && new Date(selectedEvent.endDate).toLocaleDateString()}
              </div>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row sm:space-x-2 mt-4 sm:mt-0">
            <Button
              variant="primary"
              onClick={handleTwitterSearch}
              icon={<Twitter size={16} />}
              disabled={isSearchingTwitter || !selectedEvent}
              className="mb-2 sm:mb-0"
            >
              {isSearchingTwitter ? 'Searching...' : 'Search Twitter'}
            </Button>
            
            <Button
              variant="primary"
              onClick={() => selectedEvent && selectedEvent._id ? debouncedFetchFeedback(selectedEvent._id, pagination.page, filters) : setError('No event selected')}
              icon={<RefreshCw size={16} />}
            >
              Refresh
            </Button>
          </div>
        </div>
        {loading && feedback.length > 0 && (
          <div className="mt-2 text-sm text-gray-400 animate-pulse">
            Refreshing data...
          </div>
        )}
      </div>
      
      {error && (
        <div className="mb-6 rounded-xl bg-red-900/20 p-4 text-red-300 animate-fade-in">
          {error}
        </div>
      )}
      
      {!selectedEvent ? (
        <div className="flex h-96 flex-col items-center justify-center p-6 bg-[#00001A] rounded-xl animate-fade-in">
          <MessageCircle size={48} className="mb-4 text-[#9D174D]" />
          <h3 className="text-lg font-medium text-white">No event selected</h3>
          <p className="mt-1 text-sm text-gray-400">
            Please select an event to view feedback.
          </p>
          <Button
            variant="primary"
            className="mt-4 bg-[#9D174D] hover:bg-[#C53070] text-white transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:rotate-2"
            onClick={() => (window.location.href = '/events')}
          >
            Go to Events
          </Button>
        </div>
      ) : (
        <>
          <div className="bg-white/5 backdrop-blur-lg rounded-xl shadow-xl p-6 mb-6 transform transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center mb-4 sm:mb-0">
                <Filter size={22} className="mr-2 text-[#9D174D]" />
                <h2 className="text-lg font-medium text-white">Filters</h2>
              </div>
              
              <div className="flex space-x-2">
                {Object.values(filters).some(val => val !== '') && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={clearFilters}
                    className="bg-[#00001A] hover:bg-[#9D174D]/20 text-white transition-all duration-300 transform hover:scale-105 hover:rotate-2"
                  >
                    Clear Filters
                  </Button>
                )}
                
                <Button
                  variant="primary"
                  size="sm"
                  onClick={exportFeedback}
                  className="bg-[#9D174D] hover:bg-[#C53070] text-white transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:rotate-2"
                  icon={<Download size={14} className="mr-2 text-[#9D174D]" />}
                >
                  Export
                </Button>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label htmlFor="sentiment" className="block text-sm font-medium text-gray-300 mb-1">
                  Sentiment
                </label>
                <select
                  id="sentiment"
                  name="sentiment"
                  className="block w-full rounded-md bg-gray-800 border border-gray-700 text-white shadow-sm focus:border-[#9D174D] focus:ring-[#9D174D] sm:text-sm"
                  value={filters.sentiment}
                  onChange={handleFilterChange}
                >
                  <option value="">All Sentiments</option>
                  <option value="positive">Positive</option>
                  <option value="neutral">Neutral</option>
                  <option value="negative">Negative</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="source" className="block text-sm font-medium text-gray-300 mb-1">
                  Source
                </label>
                <select
                  id="source"
                  name="source"
                  className="block w-full rounded-md bg-gray-800 border border-gray-700 text-white shadow-sm focus:border-[#9D174D] focus:ring-[#9D174D] sm:text-sm"
                  value={filters.source}
                  onChange={handleFilterChange}
                >
                  <option value="">All Sources</option>
                  <option value="twitter">Twitter</option>
                  <option value="instagram">Instagram</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="direct">Direct</option>
                  <option value="survey">Survey</option>
                  <option value="app_chat">App Chat</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="issueType" className="block text-sm font-medium text-gray-300 mb-1">
                  Issue Type
                </label>
                <select
                  id="issueType"
                  name="issueType"
                  className="block w-full rounded-md bg-gray-800 border border-gray-700 text-white shadow-sm focus:border-[#9D174D] focus:ring-[#9D174D] sm:text-sm"
                  value={filters.issueType}
                  onChange={handleFilterChange}
                >
                  <option value="">All Issues</option>
                  <option value="queue">Queue/Waiting</option>
                  <option value="audio">Audio</option>
                  <option value="video">Video/Display</option>
                  <option value="crowding">Crowding</option>
                  <option value="amenities">Amenities</option>
                  <option value="content">Content</option>
                  <option value="temperature">Temperature</option>
                  <option value="safety">Safety</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-300 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  id="search"
                  name="search"
                  className="block w-full rounded-md bg-gray-800 border border-gray-700 text-white shadow-sm focus:border-[#9D174D] focus:ring-[#9D174D] sm:text-sm"
                  placeholder="Search feedback..."
                  value={filters.search}
                  onChange={handleFilterChange}
                />
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-300 mb-1">
                  Start Date
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-[#9D174D]" aria-hidden="true" />
                  </div>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    className="focus:ring-[#9D174D] focus:border-[#9D174D] block w-full pl-10 sm:text-sm bg-gray-800 border border-gray-700 text-white rounded-md"
                    value={filters.startDate}
                    onChange={handleFilterChange}
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-300 mb-1">
                  End Date
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-[#9D174D]" aria-hidden="true" />
                  </div>
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    className="focus:ring-[#9D174D] focus:border-[#9D174D] block w-full pl-10 sm:text-sm bg-gray-800 border border-gray-700 text-white rounded-md"
                    value={filters.endDate}
                    onChange={handleFilterChange}
                  />
                </div>
              </div>
            </div>
          </div>

          {selectedFeedback.length > 0 && (
            <div className="bg-[#9D174D]/20 border border-[#9D174D]/50 rounded-xl p-4 mb-6 flex items-center justify-between animate-fade-in">
              <div className="flex items-center">
                <CheckSquare className="h-5 w-5 text-[#9D174D] mr-2" />
                <span className="text-sm font-medium text-white">
                  {selectedFeedback.length} items selected
                </span>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedFeedback([])}
                  className="bg-[#00001A] hover:bg-[#9D174D]/20 text-white transition-all duration-300 transform hover:scale-105 hover:rotate-2"
                >
                  Clear Selection
                </Button>
                
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsBatchModalOpen(true)}
                  className="bg-[#9D174D] hover:bg-[#C53070] text-white transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:rotate-2"
                >
                  Batch Process
                </Button>
              </div>
            </div>
          )}
          
          <div className="bg-white/5 backdrop-blur-lg rounded-xl shadow-xl p-6 mb-6 transform transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader size="lg" className="text-[#9D174D] animate-spin" />
              </div>
            ) : feedback.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <MessageCircle size={48} className="text-[#9D174D] mb-4" />
                <p className="text-white text-lg">No feedback found</p>
                <p className="text-gray-400 text-sm mt-2">
                  Try adjusting your filters or adding new feedback.
                </p>
              </div>
            ) : (
              <>
                <FeedbackTable
                  feedback={feedback}
                  onViewDetails={handleViewFeedback}
                  onDelete={(id) => {
                    setViewFeedback(feedback.find(item => item._id === id));
                    setIsDeleteModalOpen(true);
                  }}
                  selectedFeedback={selectedFeedback}
                  setSelectedFeedback={setSelectedFeedback}
                />
                
                <div className="flex items-center justify-between border-t border-gray-600 px-4 py-3 sm:px-6 mt-4">
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-300">
                        Showing <span className="font-medium">{feedback.length}</span> of{' '}
                        <span className="font-medium">{pagination.total}</span> results
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                          onClick={() => handlePageChange(pagination.page - 1)}
                          disabled={pagination.page === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-600 bg-white/5 text-sm font-medium text-gray-300 hover:bg-[#9D174D]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">Previous</span>
                          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                        
                        {[...Array(pagination.totalPages).keys()].map((page) => (
                          <button
                            key={page + 1}
                            onClick={() => handlePageChange(page + 1)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              pagination.page === page + 1
                                ? 'z-10 bg-[#9D174D] border-[#9D174D] text-white'
                                : 'bg-white/5 border-gray-600 text-gray-300 hover:bg-[#9D174D]/20'
                            }`}
                          >
                            {page + 1}
                          </button>
                        ))}
                        
                        <button
                          onClick={() => handlePageChange(pagination.page + 1)}
                          disabled={pagination.page === pagination.totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-600 bg-white/5 text-sm font-medium text-gray-300 hover:bg-[#9D174D]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">Next</span>
                          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title="Feedback Details"
            className="bg-[#00001A] border border-[#9D174D]/50"
          >
            {viewFeedback && (
              <div className="space-y-4 text-white">
                <div className="flex items-center space-x-2">
                  {viewFeedback.sentiment === 'positive' ? (
                    <Smile className="text-green-400" size={20} />
                  ) : viewFeedback.sentiment === 'negative' ? (
                    <Frown className="text-red-400" size={20} />
                  ) : (
                    <Meh className="text-yellow-400" size={20} />
                  )}
                  <span className="font-medium capitalize">{viewFeedback.sentiment}</span>
                  <span className="text-sm text-gray-400">
                    (Score: {viewFeedback.sentimentScore.toFixed(2)})
                  </span>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-300">Feedback</h3>
                  <p className="mt-1 text-white">{viewFeedback.text}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-300">Source</h3>
                    <p className="mt-1 capitalize text-white">{viewFeedback.source}</p>
                    {viewFeedback.metadata?.username && (
                      <p className="text-sm text-gray-400">
                        By: {viewFeedback.metadata.username}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-300">Date & Time</h3>
                    <p className="mt-1 text-white">
                      {new Date(viewFeedback.createdAt).toLocaleString()}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-300">Issue Type</h3>
                    <p className="mt-1 capitalize text-white">
                      {viewFeedback.issueType || 'Not classified'}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-300">Location</h3>
                    <p className="mt-1 text-white">
                      {viewFeedback.issueDetails?.location || 'Not specified'}
                    </p>
                  </div>
                </div>
                
                {viewFeedback.metadata?.keywords?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-300">Keywords</h3>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {viewFeedback.metadata.keywords.map((keyword, index) => (
                        <span 
                          key={index}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#9D174D]/20 text-white"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Modal>
          
          <Modal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            title="Delete Feedback"
            className="bg-[#00001A] border border-[#9D174D]/50"
            footer={
              <>
                <Button
                  variant="secondary"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="bg-[#00001A] hover:bg-[#9D174D]/20 text-white transition-all duration-300 transform hover:scale-105 hover:rotate-2"
                >
                  Cancel
                </Button>
                
                <Button
                  variant="danger"
                  onClick={() => handleDeleteFeedback(viewFeedback?._id)}
                  className="bg-[#9D174D] hover:bg-[#C53070] text-white transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:rotate-2"
                  icon={<Trash2 size={16} className="mr-2 text-[#9D174D]" />}
                >
                  Delete
                </Button>
              </>
            }
          >
            <p className="text-white">
              Are you sure you want to delete this feedback?
            </p>
            <p className="mt-2 text-sm text-gray-400">
              This action cannot be undone.
            </p>
          </Modal>
          
          <Modal
            isOpen={isBatchModalOpen}
            onClose={() => setIsBatchModalOpen(false)}
            title="Batch Process Feedback"
            className="bg-[#00001A] border border-[#9D174D]/50"
            footer={
              <>
                <Button
                  variant="secondary"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="bg-[#00001A] hover:bg-[#9D174D]/20 text-white transition-all duration-300 transform hover:scale-105 hover:rotate-2"
                >
                  Cancel
                </Button>
                
                <Button
                  variant="primary"
                  onClick={handleBatchProcess}
                  className="bg-[#9D174D] hover:bg-[#C53070] text-white transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:rotate-2"
                  icon={<CheckSquare size={16} className="mr-2 text-[#9D174D]" />}
                >
                  Process {selectedFeedback.length} Items
                </Button>
              </>
            }
          >
            <div className="space-y-4 text-white">
              <p>
                Apply the following updates to {selectedFeedback.length} selected feedback items:
              </p>
              
              <div>
                <label htmlFor="batch-issueType" className="block text-sm font-medium text-gray-300">
                  Issue Type
                </label>
                <select
                  id="batch-issueType"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-[#9D174D] focus:border-[#9D174D] sm:text-sm rounded-md"
                  value={batchAction.issueType}
                  onChange={(e) => setBatchAction({...batchAction, issueType: e.target.value})}
                >
                  <option value="">No Change</option>
                  <option value="queue">Queue/Waiting</option>
                  <option value="audio">Audio</option>
                  <option value="video">Video/Display</option>
                  <option value="crowding">Crowding</option>
                  <option value="amenities">Amenities</option>
                  <option value="content">Content</option>
                  <option value="temperature">Temperature</option>
                  <option value="safety">Safety</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <input
                  id="batch-processed"
                  name="processed"
                  type="checkbox"
                  className="h-4 w-4 text-[#9D174D] focus:ring-[#9D174D] border-gray-700 rounded bg-gray-800"
                  checked={batchAction.processed}
                  onChange={(e) => setBatchAction({...batchAction, processed: e.target.checked})}
                />
                <label htmlFor="batch-processed" className="ml-2 block text-sm text-white">
                  Mark as processed
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  id="batch-resolved"
                  name="resolved"
                  type="checkbox"
                  className="h-4 w-4 text-[#9D174D] focus:ring-[#9D174D] border-gray-700 rounded bg-gray-800"
                  checked={batchAction.resolved}
                  onChange={(e) => setBatchAction({...batchAction, resolved: e.target.checked})}
                />
                <label htmlFor="batch-resolved" className="ml-2 block text-sm text-white">
                  Mark issues as resolved
                </label>
              </div>
            </div>
          </Modal>
          
          <Modal
            isOpen={isFeedbackFormOpen}
            onClose={() => setIsFeedbackFormOpen(false)}
            title="Add Feedback"
            className="bg-[#00001A] border border-[#9D174D]/50"
          >
            <FeedbackForm
              onSuccess={() => {
                setIsFeedbackFormOpen(false);
                debouncedFetchFeedback(selectedEvent._id, pagination.page, filters);
              }}
            />
          </Modal>
        </>
      )}
    </div>
  );
};

export default Feedback;
