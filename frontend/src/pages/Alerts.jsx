import React, { useState, useEffect, useContext, useCallback, memo } from 'react';
import { EventContext } from '../context/EventContext';
import { SocketContext } from '../context/SocketContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Loader } from '../components/common/Loader';
import alertService from '../services/alertService';
import {
  Bell,
  Filter,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle,
  User,
  MapPin,
  ChevronRight,
  Smile,
  Frown,
  Meh,
  ChevronDown,
  Plus,
  Edit,
  Trash2,
  Activity,
  Clipboard,
  Info
} from 'react-feather';

// Utility functions
const getSeverityIcon = (severity) => {
  switch (severity) {
    case 'critical': return <AlertCircle className="text-red-600" />;
    case 'high': return <AlertTriangle className="text-orange-500" />;
    case 'medium': return <AlertTriangle className="text-yellow-500" />;
    case 'low':
    default: return <Info className="text-blue-500" />;
  }
};

const getSeverityClass = (severity) => {
  switch (severity) {
    case 'critical': return 'bg-red-100 text-red-800 border-red-300';
    case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'low':
    default: return 'bg-blue-100 text-blue-800 border-blue-300';
  }
};

const getStatusClass = (status) => {
  switch (status) {
    case 'new': return 'bg-red-100 text-red-800 border-red-300';
    case 'acknowledged': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'inProgress': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'resolved': return 'bg-green-100 text-green-800 border-green-300';
    case 'ignored': return 'bg-gray-100 text-gray-800 border-gray-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

const formatDate = (date) => {
  return date ? new Date(date).toLocaleString() : 'N/A';
};

const formatDuration = (start, end) => {
  if (!start || !end) return 'N/A';
  const durationMs = new Date(end) - new Date(start);
  const minutes = Math.floor(durationMs / 60000);
  
  if (minutes < 60) return `${minutes} min${minutes !== 1 ? 's' : ''}`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours < 24) return `${hours} hr${hours !== 1 ? 's' : ''} ${remainingMinutes} min${remainingMinutes !== 1 ? 's' : ''}`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days} day${days !== 1 ? 's' : ''} ${remainingHours} hr${remainingHours !== 1 ? 's' : ''}`;
};

// AlertList component
const AlertList = memo(({ alerts, onViewDetail, onStatusChange, onDelete, selectedIds, onSelectMultiple }) => {
  const isSelected = (id) => selectedIds.includes(id);
  
  const toggleSelection = useCallback((id) => {
    if (isSelected(id)) {
      onSelectMultiple(selectedIds.filter(itemId => itemId !== id));
    } else {
      onSelectMultiple([...selectedIds, id]);
    }
  }, [selectedIds, onSelectMultiple]);
  
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.length === alerts.length) {
      onSelectMultiple([]);
    } else {
      onSelectMultiple(alerts.map(item => item._id));
    }
  }, [alerts, selectedIds, onSelectMultiple]);
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="w-12 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <input
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={selectedIds.length > 0 && selectedIds.length === alerts.length}
                onChange={toggleSelectAll}
              />
            </th>
            <th scope="col" className="w-12 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Severity
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Alert
            </th>
            <th scope="col" className="w-24 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th scope="col" className="w-32 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="w-32 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created
            </th>
            <th scope="col" className="w-32 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {alerts.map((alert) => (
            <tr key={alert._id} className={isSelected(alert._id) ? 'bg-blue-50' : ''}>
              <td className="px-6 py-4 whitespace-nowrap">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={isSelected(alert._id)}
                  onChange={() => toggleSelection(alert._id)}
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  {getSeverityIcon(alert.severity)}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm font-medium text-gray-900 line-clamp-1">{alert.title}</div>
                <div className="text-xs text-gray-500 line-clamp-1">{alert.description}</div>
                {alert.location && (
                  <div className="text-xs text-gray-500 flex items-center mt-1">
                    <MapPin size={12} className="mr-1" />
                    {alert.location}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="capitalize text-sm text-gray-700">{alert.type}</span>
                <div className="text-xs text-gray-500 mt-1">{alert.category}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${getStatusClass(alert.status)}`}>
                  {alert.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(alert.createdAt)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex space-x-2">
                  <button
                    onClick={() => onViewDetail(alert)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    View
                  </button>
                  {alert.status !== 'resolved' && (
                    <button
                      onClick={() => onStatusChange(alert._id, 'resolved')}
                      className="text-green-600 hover:text-green-800"
                    >
                      Resolve
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(alert._id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

// AlertFilter component
const AlertFilter = ({ filters, setFilters, onApplyFilters, alertTypes }) => {
  const [localFilters, setLocalFilters] = useState({ ...filters });
  
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);
  
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setLocalFilters(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);
  
  const handleReset = useCallback(() => {
    const resetFilters = {
      severity: 'all',
      type: 'all',
      category: 'all',
      status: 'all',
      startDate: '',
      endDate: '',
      search: ''
    };
    setLocalFilters(resetFilters);
    setFilters(resetFilters);
    onApplyFilters(resetFilters);
  }, [setFilters, onApplyFilters]);
  
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    setFilters(localFilters);
    onApplyFilters(localFilters);
  }, [localFilters, setFilters, onApplyFilters]);
  
  return (
    <Card className="mb-6">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div>
            <label htmlFor="severity" className="block text-sm font-medium text-gray-700">
              Severity
            </label>
            <select
              id="severity"
              name="severity"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={localFilters.severity}
              onChange={handleChange}
            >
              <option value="all">All</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700">
              Type
            </label>
            <select
              id="type"
              name="type"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={localFilters.type}
              onChange={handleChange}
            >
              <option value="all">All</option>
              {alertTypes?.types?.map(type => (
                <option key={type.id} value={type.id}>{type.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              id="category"
              name="category"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={localFilters.category}
              onChange={handleChange}
            >
              <option value="all">All</option>
              {alertTypes?.categories?.map(category => (
                <option key={category.id} value={category.id}>{category.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              id="status"
              name="status"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={localFilters.status}
              onChange={handleChange}
            >
              <option value="all">All</option>
              <option value="new">New</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="inProgress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="ignored">Ignored</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={localFilters.startDate}
              onChange={handleChange}
            />
          </div>
          
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700">
              Search
            </label>
            <input
              type="text"
              id="search"
              name="search"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Search alerts..."
              value={localFilters.search}
              onChange={handleChange}
            />
          </div>
        </div>
        
        <div className="mt-4 flex justify-end space-x-3">
          <Button
            type="button"
            variant="secondary"
            onClick={handleReset}
          >
            Reset
          </Button>
          
          <Button
            type="submit"
            variant="primary"
            icon={<Filter size={16} className="mr-2" />}
          >
            Apply Filters
          </Button>
        </div>
      </form>
    </Card>
  );
};

// AlertDetailModal component
const AlertDetailModal = ({ isOpen, onClose, alert, onStatusChange }) => {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  if (!alert) return null;
  
  const handleStatusChange = async (status) => {
    try {
      setSubmitting(true);
      await onStatusChange(alert._id, status, note);
      setNote('');
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Alert: ${alert.title}`}
      size="lg"
    >
      <div className="space-y-6">
        <div className={`p-4 rounded-md ${getSeverityClass(alert.severity)}`}>
          <div className="flex items-start">
            <div className="mr-3 flex-shrink-0">
              {getSeverityIcon(alert.severity)}
            </div>
            <div>
              <h3 className="text-lg font-medium">{alert.title}</h3>
              <p className="mt-1">{alert.description}</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Alert Details</h3>
            <div className="bg-gray-50 rounded-md p-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-gray-500">Type:</dt>
                <dd className="capitalize">{alert.type}</dd>
                
                <dt className="text-gray-500">Category:</dt>
                <dd className="capitalize">{alert.category}</dd>
                
                <dt className="text-gray-500">Severity:</dt>
                <dd className="capitalize">{alert.severity}</dd>
                
                <dt className="text-gray-500">Status:</dt>
                <dd>
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${getStatusClass(alert.status)}`}>
                    {alert.status}
                  </span>
                </dd>
                
                <dt className="text-gray-500">Created:</dt>
                <dd>{formatDate(alert.createdAt)}</dd>
                
                {alert.resolvedAt && (
                  <>
                    <dt className="text-gray-500">Resolved:</dt>
                    <dd>{formatDate(alert.resolvedAt)}</dd>
                    
                    <dt className="text-gray-500">Time to Resolve:</dt>
                    <dd>{formatDuration(alert.createdAt, alert.resolvedAt)}</dd>
                  </>
                )}
                
                {alert.assignedTo && (
                  <>
                    <dt className="text-gray-500">Assigned To:</dt>
                    <dd>{alert.assignedTo}</dd>
                  </>
                )}
                
                {alert.location && (
                  <>
                    <dt className="text-gray-500">Location:</dt>
                    <dd>{alert.location}</dd>
                  </>
                )}
              </dl>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Status Updates</h3>
            <div className="bg-gray-50 rounded-md p-4 max-h-60 overflow-y-auto">
              {alert.statusUpdates && alert.statusUpdates.length > 0 ? (
                <div className="space-y-3">
                  {alert.statusUpdates.map((update, index) => (
                    <div key={index} className="pb-3 border-b border-gray-200 last:border-0">
                      <div className="flex justify-between text-sm">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${getStatusClass(update.status)}`}>
                          {update.status}
                        </span>
                        <span className="text-gray-500">{formatDate(update.timestamp)}</span>
                      </div>
                      {update.note && (
                        <p className="mt-1 text-sm">{update.note}</p>
                      )}
                      {update.updatedBy && (
                        <div className="mt-1 flex items-center text-xs text-gray-500">
                          <User size={12} className="mr-1" />
                          {update.updatedBy}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No status updates available</p>
              )}
            </div>
          </div>
        </div>
        
        {alert.status !== 'resolved' && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Update Status</h3>
            <div className="bg-gray-50 rounded-md p-4">
              <div className="mb-3">
                <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
                  Add a note (optional)
                </label>
                <textarea
                  id="note"
                  rows="2"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add details about this status change..."
                ></textarea>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {alert.status === 'new' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleStatusChange('acknowledged')}
                    disabled={submitting}
                  >
                    {submitting ? <Loader size="sm" color="white" className="mr-1" /> : null}
                    Acknowledge
                  </Button>
                )}
                
                {['new', 'acknowledged'].includes(alert.status) && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleStatusChange('inProgress')}
                    disabled={submitting}
                  >
                    {submitting ? <Loader size="sm" color="white" className="mr-1" /> : null}
                    In Progress
                  </Button>
                )}
                
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => handleStatusChange('resolved')}
                  disabled={submitting}
                >
                  {submitting ? <Loader size="sm" color="white" className="mr-1" /> : null}
                  Resolve
                </Button>
                
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleStatusChange('ignored')}
                  disabled={submitting}
                >
                  {submitting ? <Loader size="sm" color="white" className="mr-1" /> : null}
                  Ignore
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {alert.relatedFeedback && alert.relatedFeedback.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Related Feedback</h3>
            <div className="bg-gray-50 rounded-md p-4 max-h-40 overflow-y-auto">
              <ul className="space-y-2">
                {alert.relatedFeedback.map((feedback) => (
                  <li key={feedback._id} className="text-sm">
                    <div className="flex items-start">
                      <div className="mr-2 mt-0.5">
                        {feedback.sentiment === 'positive' ? (
                          <Smile className="text-green-500" size={16} />
                        ) : feedback.sentiment === 'negative' ? (
                          <Frown className="text-red-500" size={16} />
                        ) : (
                          <Meh className="text-gray-500" size={16} />
                        )}
                      </div>
                      <div>
                        <p className="line-clamp-2">{feedback.text}</p>
                        <span className="text-xs text-gray-500">{formatDate(feedback.createdAt)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

// CreateAlertModal component
const CreateAlertModal = ({ isOpen, onClose, onSubmit, eventId, alertTypes }) => {
  const [formData, setFormData] = useState({
    event: '',
    type: 'issue',
    severity: 'medium',
    title: '',
    description: '',
    category: 'general',
    location: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (eventId) {
      setFormData(prev => ({ ...prev, event: eventId }));
    }
  }, [eventId]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description) {
      setError('Please fill in all required fields');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      await onSubmit(formData);
      onClose();
      setFormData({
        event: eventId || '',
        type: 'issue',
        severity: 'medium',
        title: '',
        description: '',
        category: 'general',
        location: ''
      });
    } catch (err) {
      setError(err.message || 'Failed to create alert');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Manual Alert"
      size="md"
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
        
        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Alert Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              rows="3"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={formData.description}
              onChange={handleChange}
              required
            ></textarea>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                Alert Type
              </label>
              <select
                id="type"
                name="type"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formData.type}
                onChange={handleChange}
              >
                {alertTypes?.types?.map(type => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="severity" className="block text-sm font-medium text-gray-700">
                Severity
              </label>
              <select
                id="severity"
                name="severity"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formData.severity}
                onChange={handleChange}
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                id="category"
                name="category"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formData.category}
                onChange={handleChange}
              >
                {alertTypes?.categories?.map(category => (
                  <option key={category.id} value={category.id}>{category.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                Location (Optional)
              </label>
              <input
                type="text"
                id="location"
                name="location"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="E.g. Main Hall, Room 3, etc."
                value={formData.location}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>
        
        <div className="mt-5 flex justify-end space-x-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
          >
            {loading ? <Loader size="sm" color="white" className="mr-2" /> : null}
            Create Alert
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// BatchResolveModal component
const BatchResolveModal = ({ isOpen, onClose, selectedCount, onSubmit }) => {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      await onSubmit(note);
      setNote('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to resolve alerts');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Resolve ${selectedCount} Alerts`}
      size="md"
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
        
        <div>
          <p className="text-gray-700">
            You are about to resolve {selectedCount} alert{selectedCount !== 1 ? 's' : ''}.
          </p>
          
          <div className="mt-4">
            <label htmlFor="note" className="block text-sm font-medium text-gray-700">
              Resolution Note (Optional)
            </label>
            <textarea
              id="note"
              rows="3"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add an optional note about resolving these alerts..."
            ></textarea>
          </div>
        </div>
        
        <div className="mt-5 flex justify-end space-x-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          
          <Button
            type="submit"
            variant="success"
            disabled={loading}
          >
            {loading ? <Loader size="sm" color="white" className="mr-2" /> : null}
            Resolve Alerts
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// DeleteConfirmationModal component
const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, isMultiple, count = 1, isDeleting }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isMultiple ? `Delete ${count} Alerts` : 'Delete Alert'}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          
          <Button
            variant="danger"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader size="sm" color="white" className="mr-2" /> : null}
            Delete
          </Button>
        </>
      }
    >
      <p className="text-gray-700">
        Are you sure you want to delete {isMultiple ? `these ${count} alerts` : 'this alert'}?
      </p>
      <p className="mt-2 text-sm text-gray-500">
        This action cannot be undone. {isMultiple ? 'These alerts' : 'This alert'} will be permanently deleted from the database.
      </p>
    </Modal>
  );
};

// AlertStats component
const AlertStats = ({ alertCounts }) => {
  if (!alertCounts) {
    return <Loader />;
  }
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card className="bg-red-50">
        <div className="flex items-start">
          <div className="mr-3">
            <Bell className="h-8 w-8 text-red-600" />
          </div>
          <div>
            <p className="text-xs uppercase font-medium text-red-800">New Alerts</p>
            <h3 className="text-2xl font-bold text-red-900">{alertCounts.new || 0}</h3>
          </div>
        </div>
      </Card>
      
      <Card className="bg-yellow-50">
        <div className="flex items-start">
          <div className="mr-3">
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
          <div>
            <p className="text-xs uppercase font-medium text-yellow-800">In Progress</p>
            <h3 className="text-2xl font-bold text-yellow-900">{alertCounts.inProgress || 0}</h3>
          </div>
        </div>
      </Card>
      
      <Card className="bg-green-50">
        <div className="flex items-start">
          <div className="mr-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <p className="text-xs uppercase font-medium text-green-800">Resolved</p>
            <h3 className="text-2xl font-bold text-green-900">{alertCounts.resolved || 0}</h3>
          </div>
        </div>
      </Card>
      
      <Card className="bg-blue-50">
        <div className="flex items-start">
          <div className="mr-3">
            <AlertCircle className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <p className="text-xs uppercase font-medium text-blue-800">Total</p>
            <h3 className="text-2xl font-bold text-blue-900">{alertCounts.total || 0}</h3>
          </div>
        </div>
      </Card>
    </div>
  );
};

// Main Alerts component
const Alerts = () => {
  const { selectedEvent } = useContext(EventContext);
  const { newAlert } = useContext(SocketContext);
  
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alertCounts, setAlertCounts] = useState(null);
  const [alertTypes, setAlertTypes] = useState(null);
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  
  const [filters, setFilters] = useState({
    severity: 'all',
    type: 'all',
    category: 'all',
    status: 'all',
    startDate: '',
    endDate: '',
    search: ''
  });
  
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteMultiple, setDeleteMultiple] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [alertToDelete, setAlertToDelete] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Load alert types
  useEffect(() => {
    const loadAlertTypes = async () => {
      try {
        const types = await alertService.getAlertTypes();
        setAlertTypes(types);
      } catch (err) {
        console.error('Error loading alert types:', err);
        setError('Failed to load alert types');
      }
    };
    
    loadAlertTypes();
  }, []);
  
  // Fetch alerts when event or filters change
  useEffect(() => {
    if (selectedEvent) {
      fetchAlerts();
      fetchAlertCounts();
    }
  }, [selectedEvent, pagination.page]);
  
  // Handle new alert from socket
  useEffect(() => {
    if (newAlert && selectedEvent && newAlert.event === selectedEvent._id) {
      setAlerts(prev => [newAlert, ...prev]);
      fetchAlertCounts();
    }
  }, [newAlert, selectedEvent]);
  
  const fetchAlerts = async () => {
    if (!selectedEvent) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = {
        page: pagination.page,
        limit: pagination.limit
      };
      
      if (filters.severity !== 'all') queryParams.severity = filters.severity;
      if (filters.type !== 'all') queryParams.type = filters.type;
      if (filters.category !== 'all') queryParams.category = filters.category;
      if (filters.status !== 'all') queryParams.status = filters.status;
      if (filters.startDate) queryParams.startDate = filters.startDate;
      if (filters.endDate) queryParams.endDate = filters.endDate;
      if (filters.search) queryParams.search = filters.search;
      
      const response = await alertService.getEventAlerts(selectedEvent._id, queryParams);
      
      setAlerts(response.data);
      setPagination({
        page: response.pagination.page,
        limit: response.pagination.limit,
        total: response.total,
        totalPages: response.pagination.totalPages
      });
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError('Failed to load alerts. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchAlertCounts = async () => {
    if (!selectedEvent) return;
    
    try {
      const counts = await alertService.getActiveAlertCount(selectedEvent._id);
      setAlertCounts(counts);
    } catch (err) {
      console.error('Error fetching alert counts:', err);
    }
  };
  
  const handleApplyFilters = useCallback(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchAlerts();
  }, [fetchAlerts]);
  
  const handlePageChange = useCallback((newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  }, []);
  
  const handleViewDetail = async (alert) => {
    try {
      const fullAlert = await alertService.getAlertById(alert._id);
      setSelectedAlert(fullAlert);
      setShowDetailModal(true);
    } catch (err) {
      console.error('Error fetching alert details:', err);
      setError('Failed to load alert details. Please try again.');
    }
  };
  
  const handleStatusChange = async (alertId, status, note = '') => {
    try {
      const updatedAlert = await alertService.updateAlertStatus(alertId, status, note);
      
      setAlerts(prev => prev.map(alert => (
        alert._id === alertId ? updatedAlert : alert
      )));
      
      if (selectedAlert && selectedAlert._id === alertId) {
        setSelectedAlert(updatedAlert);
      }
      
      fetchAlertCounts();
      
      return updatedAlert;
    } catch (err) {
      console.error('Error updating alert status:', err);
      throw err;
    }
  };
  
  const handleCreateAlert = async (alertData) => {
    try {
      if (selectedEvent && !alertData.event) {
        alertData.event = selectedEvent._id;
      }
      
      const newAlert = await alertService.createAlert(alertData);
      
      setAlerts(prev => [newAlert, ...prev]);
      fetchAlertCounts();
      
      return newAlert;
    } catch (err) {
      console.error('Error creating alert:', err);
      throw err;
    }
  };
  
  const handleDelete = (alertId) => {
    setAlertToDelete(alertId);
    setDeleteMultiple(false);
    setShowDeleteModal(true);
  };
  
  const handleDeleteConfirm = async () => {
    try {
      setIsDeleting(true);
      
      if (deleteMultiple) {
        await Promise.all(selectedIds.map(id => alertService.deleteAlert(id)));
        setAlerts(prev => prev.filter(alert => !selectedIds.includes(alert._id)));
        setSelectedIds([]);
      } else {
        await alertService.deleteAlert(alertToDelete);
        setAlerts(prev => prev.filter(alert => alert._id !== alertToDelete));
      }
      
      fetchAlertCounts();
      setShowDeleteModal(false);
    } catch (err) {
      console.error('Error deleting alert:', err);
      setError('Failed to delete alert. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };
  
  const handleResolveSelected = () => {
    if (selectedIds.length === 0) return;
    setShowBatchModal(true);
  };
  
  const handleBatchResolve = async (note) => {
    try {
      await alertService.resolveMultipleAlerts(selectedIds, note);
      fetchAlerts();
      fetchAlertCounts();
      setSelectedIds([]);
    } catch (err) {
      console.error('Error resolving alerts:', err);
      throw err;
    }
  };
  
  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    setDeleteMultiple(true);
    setShowDeleteModal(true);
  };
  
  const handleRefresh = () => {
    fetchAlerts();
    fetchAlertCounts();
  };
  
  if (!selectedEvent) {
    return (
      <div className="flex h-64 flex-col items-center justify-center p-6">
        <Bell size={48} className="mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900">No event selected</h3>
        <p className="mt-1 text-sm text-gray-500">
          Please select an event to view alerts.
        </p>
        <Button
          variant="primary"
          className="mt-4"
          onClick={() => window.location.href = '/events'}
        >
          Go to Events
        </Button>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Alerts for {selectedEvent.name}</h1>
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            onClick={handleRefresh}
            icon={<RefreshCw size={16} className="mr-2" />}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
            icon={<Plus size={16} className="mr-2" />}
          >
            Create Alert
          </Button>
        </div>
      </div>
      
      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      
      <AlertStats alertCounts={alertCounts} />
      
      <AlertFilter
        filters={filters}
        setFilters={setFilters}
        onApplyFilters={handleApplyFilters}
        alertTypes={alertTypes}
      />
      
      <Card className="mb-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-medium">Alert List</h2>
            <p className="text-sm text-gray-500">
              {pagination.total} total items • Page {pagination.page} of {pagination.totalPages || 1}
            </p>
          </div>
          {selectedIds.length > 0 && (
            <div className="flex space-x-3">
              <Button
                variant="success"
                size="sm"
                onClick={handleResolveSelected}
              >
                Resolve Selected ({selectedIds.length})
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteSelected}
              >
                Delete Selected ({selectedIds.length})
              </Button>
            </div>
          )}
        </div>
        
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader size="lg" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center">
            <Bell size={48} className="mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900">No alerts found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your filters or create a new alert.
            </p>
          </div>
        ) : (
          <>
            <AlertList
              alerts={alerts}
              onViewDetail={handleViewDetail}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              selectedIds={selectedIds}
              onSelectMultiple={setSelectedIds}
            />
            {pagination.totalPages > 1 && (
              <div className="mt-4 flex justify-center">
                <nav className="flex items-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handlePageChange(Math.max(pagination.page - 1, 1))}
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </Button>
                  <span className="mx-4 text-sm text-gray-700">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handlePageChange(Math.min(pagination.page + 1, pagination.totalPages))}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Next
                  </Button>
                </nav>
              </div>
            )}
          </>
        )}
      </Card>
      
      <AlertDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        alert={selectedAlert}
        onStatusChange={handleStatusChange}
      />
      
      <CreateAlertModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateAlert}
        eventId={selectedEvent._id}
        alertTypes={alertTypes}
      />
      
      <BatchResolveModal
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        selectedCount={selectedIds.length}
        onSubmit={handleBatchResolve}
      />
      
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        isMultiple={deleteMultiple}
        count={selectedIds.length}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default Alerts;