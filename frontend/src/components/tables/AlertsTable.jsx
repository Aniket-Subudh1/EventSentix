import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, AlertCircle, AlertTriangle, Info, MapPin, Check, Clock, XCircle } from 'react-feather';

const AlertsTable = ({ 
  alerts, 
  onViewDetails, 
  onUpdateStatus,
  onAssign,
  onDelete
}) => {
  // Get severity icon based on alert severity
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="text-red-600" size={18} />;
      case 'high':
        return <AlertTriangle className="text-orange-500" size={18} />;
      case 'medium':
        return <AlertTriangle className="text-yellow-500" size={18} />;
      case 'low':
      default:
        return <Info className="text-blue-500" size={18} />;
    }
  };
  
  // Get status badge based on alert status
  const getStatusBadge = (status) => {
    const statusClasses = {
      new: 'bg-red-100 text-red-800',
      acknowledged: 'bg-blue-100 text-blue-800',
      inProgress: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      ignored: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${statusClasses[status]}`}>
        {status}
      </span>
    );
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
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Severity
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Alert Details
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Location
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
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
          {alerts.length === 0 ? (
            <tr>
              <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                No alerts found
              </td>
            </tr>
          ) : (
            alerts.map((alert) => (
              <tr key={alert._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getSeverityIcon(alert.severity)}
                    <span className="ml-1 text-xs font-medium capitalize">{alert.severity}</span>
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{alert.title}</div>
                  <div className="text-sm text-gray-500 line-clamp-2">{alert.description}</div>
                  {alert.category && (
                    <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {alert.category}
                    </span>
                  )}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  {alert.location ? (
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin size={14} className="mr-1" />
                      {alert.location}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(alert.status)}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <Clock className="mr-1" size={14} />
                    {formatTime(alert.createdAt)}
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => onViewDetails(alert)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View
                    </button>
                    
                    {alert.status !== 'resolved' && (
                      <button
                        onClick={() => onUpdateStatus(alert._id, 'resolved')}
                        className="text-green-600 hover:text-green-900"
                        title="Mark as Resolved"
                      >
                        Resolve
                      </button>
                    )}
                    
                    <button
                      onClick={() => onDelete(alert._id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete Alert"
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

export default AlertsTable;