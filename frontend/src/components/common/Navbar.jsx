import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { EventContext } from '../../context/EventContext';
import { Menu, Bell, Settings, User, LogOut, ChevronDown, ChevronUp } from 'react-feather';

export const Navbar = ({ toggleSidebar }) => {
  const { user, logout } = useContext(AuthContext);
  const { selectedEvent, events, setSelectedEvent } = useContext(EventContext);
  const [isEventDropdownOpen, setIsEventDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  
  const toggleEventDropdown = () => {
    setIsEventDropdownOpen(!isEventDropdownOpen);
    // Close user menu if open
    if (isUserMenuOpen) {
      setIsUserMenuOpen(false);
    }
  };

  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
    // Close event dropdown if open
    if (isEventDropdownOpen) {
      setIsEventDropdownOpen(false);
    }
  };

  const handleEventSelect = (event) => {
    setSelectedEvent(event);
    setIsEventDropdownOpen(false);
  };
  
  return (
    <nav className="bg-white border-b px-4 py-2 flex justify-between items-center">
      <div className="flex items-center">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none"
        >
          <Menu size={24} />
        </button>
        
        <Link to="/" className="ml-2 text-xl font-bold text-blue-600">
          Event Sentiment Monitor
        </Link>
      </div>
      
      <div className="flex items-center">
        {/* Event selector */}
        {events && events.length > 0 && (
          <div className="mr-4 relative inline-block text-left">
            <button 
              onClick={toggleEventDropdown}
              className="bg-gray-100 hover:bg-gray-200 rounded-md px-3 py-2 text-sm font-medium flex items-center"
              aria-expanded={isEventDropdownOpen}
              aria-haspopup="true"
            >
              <span>
                {selectedEvent ? selectedEvent.name : 'Select Event'}
              </span>
              {isEventDropdownOpen ? (
                <ChevronUp size={16} className="ml-1" />
              ) : (
                <ChevronDown size={16} className="ml-1" />
              )}
            </button>
            
            {isEventDropdownOpen && (
              <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                <div className="py-1">
                  {events.map(event => (
                    <button
                      key={event.id}
                      className={`text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                        selectedEvent && selectedEvent.id === event.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handleEventSelect(event)}
                    >
                      <div className="flex items-center justify-between">
                        <span>{event.name}</span>
                        {event.isActive && (
                          <span className="bg-green-500 w-2 h-2 rounded-full"></span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Notifications */}
        <button className="p-2 rounded-md text-gray-600 hover:bg-gray-100 relative">
          <Bell size={20} />
          <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 text-white text-xs flex items-center justify-center rounded-full">
            3
          </span>
        </button>
        
        {/* User menu */}
        {user && (
          <div className="ml-3 relative">
            <div>
              <button 
                className="flex items-center space-x-2 p-2 rounded-md text-gray-600 hover:bg-gray-100"
                onClick={toggleUserMenu}
                aria-expanded={isUserMenuOpen}
                aria-haspopup="true"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="font-medium">{user.name}</span>
              </button>
            </div>
            
            {isUserMenuOpen && (
              <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                <div className="py-1">
                  <Link
                    to="/profile"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <User size={16} className="mr-2" />
                    Profile
                  </Link>
                  <Link
                    to="/settings"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Settings size={16} className="mr-2" />
                    Settings
                  </Link>
                  <button
                    onClick={logout}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <LogOut size={16} className="mr-2" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};