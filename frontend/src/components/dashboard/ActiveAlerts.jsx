import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, AlertCircle, AlertTriangle, Info } from 'react-feather';

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

const getSeverityClass = (severity) => {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'low':
    default:
      return 'bg-blue-100 text-blue-800 border-blue-300';
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

const AlertItem = ({ alert }) => {
  return (
    <div className={`p-3 border-l-4 rounded mb-3 ${getSeverityClass(alert.severity)}`}>
      <div className="flex justify-between items-start">
        <div className="flex items-start">
          {getSeverityIcon(alert.severity)}
          <div className="ml-2">
            <h4 className="font-medium">{alert.title}</h4>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{alert.description}</p>
          </div>
        </div>
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {formatTime(alert.createdAt)}
        </span>
      </div>
      <div className="flex justify-between items-center mt-2">
        <div className="flex items-center">
          <span className={`px-2 py-0.5 text-xs rounded-full ${
            alert.status === 'new' ? 'bg-red-500 text-white' : 
            alert.status === 'acknowledged' ? 'bg-blue-500 text-white' : 
            alert.status === 'inProgress' ? 'bg-yellow-500 text-white' : 
            'bg-green-500 text-white'
          }`}>
            {alert.status}
          </span>
          {alert.category && (
            <span className="ml-2 text-xs text-gray-500">
              {alert.category}
            </span>
          )}
        </div>
        <Link 
          to={`/alerts/${alert._id}`}
          className="text-xs text-blue-600 hover:text-blue-800 underline"
        >
          View Details
        </Link>
      </div>
    </div>
  );
};

const ActiveAlerts = ({ alerts = [], className }) => {
  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <Bell className="text-red-500 mr-2" size={20} />
          <h3 className="text-lg font-semibold">Active Alerts</h3>
        </div>
        <Link 
          to="/alerts" 
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          View All
        </Link>
      </div>
      
      {alerts.length === 0 ? (
        <div className="text-center p-6">
          <div className="flex justify-center mb-2">
            <Bell className="text-gray-400" size={24} />
          </div>
          <p className="text-gray-500">No active alerts</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {alerts.map((alert) => (
            <AlertItem key={alert._id} alert={alert} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ActiveAlerts;