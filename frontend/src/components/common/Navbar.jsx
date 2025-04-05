import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { EventContext } from '../../context/EventContext';
import { Menu, Bell, Settings, User, LogOut, ChevronDown, ChevronUp } from 'react-feather';

export const Navbar = ({ toggleSidebar }) => {
  const { user, logout } = useContext(AuthContext);
  const { selectedEvent, events, setSelectedEvent } = useContext(EventContext);
  const [isEventDropdownOpen, setIsEventDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  
  const eventDropdownRef = useRef(null);
  const userMenuRef = useRef(null);
  
  const toggleEventDropdown = () => {
    setIsEventDropdownOpen(!isEventDropdownOpen);
    if (isUserMenuOpen) {
      setIsUserMenuOpen(false);
    }
  };

  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
    if (isEventDropdownOpen) {
      setIsEventDropdownOpen(false);
    }
  };

  const handleEventSelect = (event) => {
    setSelectedEvent(event);
    setIsEventDropdownOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (eventDropdownRef.current && !eventDropdownRef.current.contains(event.target)) {
        setIsEventDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    
    const navbarElement = document.getElementById('navbar');
    if (navbarElement) {
      navbarElement.classList.add('animate-fade-in');
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  return (
    <nav id="navbar" className="bg-[#00001A] border-b border-[#3D3D3D] px-4 py-3 flex justify-between items-center shadow-xl transform transition-all duration-300 hover:shadow-2xl">
      <div className="flex items-center">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-full text-gray-300 hover:bg-[#9D174D]/20 hover:text-white transition-all duration-300 transform hover:scale-110 border border-[#3D3D3D] hover:border-[#9D174D]"
          aria-label="Toggle sidebar"
        >
          <Menu size={24} />
        </button>
        
        <Link to="/" className="ml-3 text-xl font-bold bg-gradient-to-r from-[#9D174D] to-[#C53070] bg-clip-text text-transparent">
          Event Sentiment Monitor
        </Link>
      </div>
      
      <div className="flex items-center space-x-4">
        {events && events.length > 0 && (
          <div className="relative" ref={eventDropdownRef}>
            <button 
              onClick={toggleEventDropdown}
              className="bg-white/5 backdrop-blur-lg hover:bg-[#9D174D]/20 rounded-lg px-4 py-2 text-sm font-medium flex items-center text-gray-300 transition-all duration-300 transform hover:scale-105 border border-[#3D3D3D] hover:border-[#9D174D]"
              aria-haspopup="true"
              aria-expanded={isEventDropdownOpen}
            >
              <span>{selectedEvent ? selectedEvent.name : 'Select Event'}</span>
              {isEventDropdownOpen ? (
                <ChevronUp size={16} className="ml-2 text-[#C53070]" />
              ) : (
                <ChevronDown size={16} className="ml-2 text-[#C53070]" />
              )}
            </button>
            
            {isEventDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white/5 backdrop-blur-lg shadow-xl border border-[#3D3D3D] z-10 animate-fade-in-down">
                <div className="py-2 max-h-64 overflow-y-auto">
                  {events.map(event => (
                    <button
                      key={event.id}
                      className={`w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#9D174D]/20 hover:text-white transition-all duration-200 border-b border-[#3D3D3D] ${
                        selectedEvent && selectedEvent.id === event.id ? 'bg-[#9D174D] text-white' : ''
                      }`}
                      onClick={() => handleEventSelect(event)}
                    >
                      <div className="flex items-center justify-between">
                        <span>{event.name}</span>
                        {event.isActive && (
                          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        <button 
          className="p-2 rounded-full text-gray-300 hover:bg-[#9D174D]/20 hover:text-white relative transition-all duration-300 transform hover:scale-110 border border-[#3D3D3D] hover:border-[#9D174D]"
          aria-label="Notifications"
        >
          <Bell size={20} />
          <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 text-white text-xs flex items-center justify-center rounded-full animate-pulse border border-red-700">
            3
          </span>
        </button>
        
        {user && (
          <div className="relative" ref={userMenuRef}>
            <button 
              className="flex items-center space-x-2 p-2 rounded-lg text-gray-300 hover:bg-[#9D174D]/20 hover:text-white transition-all duration-300 transform hover:scale-105 border border-[#3D3D3D] hover:border-[#9D174D]"
              onClick={toggleUserMenu}
              aria-haspopup="true"
              aria-expanded={isUserMenuOpen}
            >
              <div className="w-8 h-8 rounded-full bg-[#9D174D] flex items-center justify-center text-white shadow-lg transform transition-all duration-300 hover:scale-110 border border-[#C53070]">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="font-medium hidden md:block">{user.name}</span>
            </button>
            
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white/5 backdrop-blur-lg shadow-xl border border-[#3D3D3D] z-10 animate-fade-in-down">
                <div className="py-2">
                  <Link
                    to="/profile"
                    className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-[#9D174D]/20 hover:text-white transition-all duration-200 border-b border-[#3D3D3D]"
                  >
                    <User size={16} className="mr-2 text-[#C53070]" />
                    Profile
                  </Link>
                  <Link
                    to="/settings"
                    className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-[#9D174D]/20 hover:text-white transition-all duration-200 border-b border-[#3D3D3D]"
                  >
                    <Settings size={16} className="mr-2 text-[#C53070]" />
                    Settings
                  </Link>
                  <button
                    onClick={logout}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#9D174D]/20 hover:text-white transition-all duration-200"
                  >
                    <LogOut size={16} className="mr-2 text-red-400" />
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