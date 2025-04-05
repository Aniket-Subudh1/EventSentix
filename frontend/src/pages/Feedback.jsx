import React, { useState, useEffect, useContext, useCallback } from 'react';
import { EventContext } from '../context/EventContext';
import { SocketContext } from '../context/SocketContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Loader } from '../components/common/Loader';
import FeedbackTable from '../components/tables/FeedbackTable';
import FeedbackForm from '../components/forms/FeedbackForm';
import feedbackService from '../services/feedbackService';
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
  Calendar 
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
        setPagination({
          ...pagination,
          total: response.total,
          totalPages: response.pagination.totalPages
        });
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Feedback</h1>
        
        <div className="flex space-x-2">
          <Button
            variant="secondary"
            onClick={() => setIsFeedbackFormOpen(true)}
            icon={<MessageCircle size={16} />}
          >
            Add Feedback
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
      
      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      
      {!selectedEvent ? (
        <div className="flex h-64 flex-col items-center justify-center p-6">
          <MessageCircle size={48} className="mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900">No event selected</h3>
          <p className="mt-1 text-sm text-gray-500">
            Please select an event to view feedback.
          </p>
          <Button
            variant="primary"
            className="mt-4"
            onClick={() => window.location.href = '/events'}
          >
            Go to Events
          </Button>
        </div>
      ) : (
        <>
          <Card className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center mb-4 sm:mb-0">
                <Filter size={18} className="mr-2 text-gray-600" />
                <h2 className="text-lg font-medium">Filters</h2>
              </div>
              
              <div className="flex space-x-2">
                {Object.values(filters).some(val => val !== '') && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={clearFilters}
                  >
                    Clear Filters
                  </Button>
                )}
                
                <Button
                  variant="primary"
                  size="sm"
                  onClick={exportFeedback}
                  icon={<Download size={14} />}
                >
                  Export
                </Button>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label htmlFor="sentiment" className="block text-sm font-medium text-gray-700 mb-1">
                  Sentiment
                </label>
                <select
                  id="sentiment"
                  name="sentiment"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
                <label htmlFor="source" className="block text-sm font-medium text-gray-700 mb-1">
                  Source
                </label>
                <select
                  id="source"
                  name="source"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
                <label htmlFor="issueType" className="block text-sm font-medium text-gray-700 mb-1">
                  Issue Type
                </label>
                <select
                  id="issueType"
                  name="issueType"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  id="search"
                  name="search"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Search feedback..."
                  value={filters.search}
                  onChange={handleFilterChange}
                />
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                    value={filters.startDate}
                    onChange={handleFilterChange}
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                    value={filters.endDate}
                    onChange={handleFilterChange}
                  />
                </div>
              </div>
            </div>
          </Card>

          {selectedFeedback.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6 flex items-center justify-between">
              <div className="flex items-center">
                <CheckSquare className="h-5 w-5 text-blue-500 mr-2" />
                <span className="text-sm font-medium text-blue-700">
                  {selectedFeedback.length} items selected
                </span>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedFeedback([])}
                >
                  Clear Selection
                </Button>
                
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsBatchModalOpen(true)}
                >
                  Batch Process
                </Button>
              </div>
            </div>
          )}
          
          <Card className="mb-6">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader size="lg" />
              </div>
            ) : feedback.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <MessageCircle size={48} className="text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">No feedback found</p>
                <p className="text-gray-400 text-sm mt-2">
                  Try adjusting your filters or adding new feedback
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
                
                <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6 mt-4">
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{feedback.length}</span> of{' '}
                        <span className="font-medium">{pagination.total}</span> results
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                          onClick={() => handlePageChange(pagination.page - 1)}
                          disabled={pagination.page === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {page + 1}
                          </button>
                        ))}
                        
                        <button
                          onClick={() => handlePageChange(pagination.page + 1)}
                          disabled={pagination.page === pagination.totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
          </Card>

          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title="Feedback Details"
          >
            {viewFeedback && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  {viewFeedback.sentiment === 'positive' ? (
                    <Smile className="text-green-500" size={20} />
                  ) : viewFeedback.sentiment === 'negative' ? (
                    <Frown className="text-red-500" size={20} />
                  ) : (
                    <Meh className="text-gray-500" size={20} />
                  )}
                  <span className="font-medium capitalize">{viewFeedback.sentiment}</span>
                  <span className="text-sm text-gray-500">
                    (Score: {viewFeedback.sentimentScore.toFixed(2)})
                  </span>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Feedback</h3>
                  <p className="mt-1 text-gray-900">{viewFeedback.text}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">Source</h3>
                    <p className="mt-1 capitalize">{viewFeedback.source}</p>
                    {viewFeedback.metadata?.username && (
                      <p className="text-sm text-gray-500">
                        By: {viewFeedback.metadata.username}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">Date & Time</h3>
                    <p className="mt-1">
                      {new Date(viewFeedback.createdAt).toLocaleString()}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">Issue Type</h3>
                    <p className="mt-1 capitalize">
                      {viewFeedback.issueType || 'Not classified'}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">Location</h3>
                    <p className="mt-1">
                      {viewFeedback.issueDetails?.location || 'Not specified'}
                    </p>
                  </div>
                </div>
                
                {viewFeedback.metadata?.keywords?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">Keywords</h3>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {viewFeedback.metadata.keywords.map((keyword, index) => (
                        <span 
                          key={index}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
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
            footer={
              <>
                <Button
                  variant="secondary"
                  onClick={() => setIsDeleteModalOpen(false)}
                >
                  Cancel
                </Button>
                
                <Button
                  variant="danger"
                  onClick={() => handleDeleteFeedback(viewFeedback?._id)}
                  icon={<Trash2 size={16} />}
                >
                  Delete
                </Button>
              </>
            }
          >
            <p className="text-gray-700">
              Are you sure you want to delete this feedback?
            </p>
            <p className="mt-2 text-sm text-gray-500">
              This action cannot be undone.
            </p>
          </Modal>
          
          <Modal
            isOpen={isBatchModalOpen}
            onClose={() => setIsBatchModalOpen(false)}
            title="Batch Process Feedback"
            footer={
              <>
                <Button
                  variant="secondary"
                  onClick={() => setIsBatchModalOpen(false)}
                >
                  Cancel
                </Button>
                
                <Button
                  variant="primary"
                  onClick={handleBatchProcess}
                  icon={<CheckSquare size={16} />}
                >
                  Process {selectedFeedback.length} Items
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <p className="text-gray-700">
                Apply the following updates to {selectedFeedback.length} selected feedback items:
              </p>
              
              <div>
                <label htmlFor="batch-issueType" className="block text-sm font-medium text-gray-700">
                  Issue Type
                </label>
                <select
                  id="batch-issueType"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
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
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={batchAction.processed}
                  onChange={(e) => setBatchAction({...batchAction, processed: e.target.checked})}
                />
                <label htmlFor="batch-processed" className="ml-2 block text-sm text-gray-900">
                  Mark as processed
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  id="batch-resolved"
                  name="resolved"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={batchAction.resolved}
                  onChange={(e) => setBatchAction({...batchAction, resolved: e.target.checked})}
                />
                <label htmlFor="batch-resolved" className="ml-2 block text-sm text-gray-900">
                  Mark issues as resolved
                </label>
              </div>
            </div>
          </Modal>
          
          <Modal
            isOpen={isFeedbackFormOpen}
            onClose={() => setIsFeedbackFormOpen(false)}
            title="Add Feedback"
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