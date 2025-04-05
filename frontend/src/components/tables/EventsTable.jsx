import React from 'react';
import { Calendar, MapPin, Clock, Users } from 'react-feather';
import { formatDate } from '../../utils/formatters';

const EventsTable = ({ 
  events, 
  onSelect, 
  onEdit, 
  onDelete, 
  onToggleActive 
}) => {
  const renderEventStatus = (event) => {
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);
    const today = new Date();

    if (startDate > today) {
      return (
        <span className="px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-blue-100 text-blue-800">
          Upcoming
        </span>
      );
    }

    if (startDate <= today && endDate >= today) {
      return (
        <span className="px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-green-100 text-green-800">
          Active
        </span>
      );
    }

    return (
      <span className="px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-gray-100 text-gray-800">
        Completed
      </span>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Event Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Dates
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Location
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {events.map((event) => (
            <tr key={event.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {event.name}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center">
                      <Users size={14} className="mr-1" />
                      {event.organizers?.length || 0} Organizers
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar size={16} className="mr-2" />
                  {formatDate(event.startDate, { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })} - {formatDate(event.endDate, { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center text-sm text-gray-500">
                  <MapPin size={16} className="mr-2" />
                  {event.location}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {renderEventStatus(event)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => onSelect(event)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    View
                  </button>
                  <button
                    onClick={() => onEdit(event)}
                    className="text-yellow-600 hover:text-yellow-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(event.id)}
                    className="text-red-600 hover:text-red-900"
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
};

export default EventsTable;