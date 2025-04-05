import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

import { 
  Home, 
  Calendar, 
  MessageCircle, 
  Bell, 
  BarChart2, 
  Share2, 
  Settings, 
  LogOut,
  Users
} from 'react-feather';

const Sidebar = ({ collapsed, setCollapsed }) => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  
  const isActive = (path) => {
    return location.pathname === path ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-blue-700 hover:text-white';
  };

  const menuItems = [
    { 
      path: '/dashboard', 
      name: 'Dashboard', 
      icon: <Home size={20} />, 
      access: ['admin', 'organizer', 'staff'] 
    },
    { 
      path: '/events', 
      name: 'Events', 
      icon: <Calendar size={20} />, 
      access: ['admin', 'organizer', 'staff'] 
    },
    { 
      path: '/feedback', 
      name: 'Feedback', 
      icon: <MessageCircle size={20} />, 
      access: ['admin', 'organizer', 'staff'] 
    },
    { 
      path: '/alerts', 
      name: 'Alerts', 
      icon: <Bell size={20} />, 
      access: ['admin', 'organizer', 'staff'] 
    },
    { 
      path: '/analytics', 
      name: 'Analytics', 
      icon: <BarChart2 size={20} />, 
      access: ['admin', 'organizer']
    },
    { 
      path: '/integrations', 
      name: 'Integrations', 
      icon: <Share2 size={20} />, 
      access: ['admin', 'organizer'] 
    },
    { 
      path: '/users', 
      name: 'User Management', 
      icon: <Users size={20} />, 
      access: ['admin'] 
    },
    { 
      path: '/settings', 
      name: 'Settings', 
      icon: <Settings size={20} />, 
      access: ['admin', 'organizer', 'staff'] 
    }
  ];

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter(item => 
    user && item.access.includes(user.role)
  );

  return (
    <div className={`bg-blue-800 text-white h-screen transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}>
      <div className="p-4 flex justify-between items-center">
        {!collapsed && <h1 className="text-xl font-bold">Event Monitor</h1>}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-full hover:bg-blue-700"
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>
      
      <div className="mt-6">
        {user && (
          <div className={`px-4 py-3 ${collapsed ? 'text-center' : 'flex items-center space-x-3'}`}>
            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            {!collapsed && (
              <div>
                <p className="font-medium">{user.name}</p>
                <p className="text-xs text-gray-300 capitalize">{user.role}</p>
              </div>
            )}
          </div>
        )}
        
        <ul className="mt-6 space-y-2 px-2">
          {filteredMenuItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center p-3 rounded-lg ${isActive(item.path)} ${collapsed ? 'justify-center' : 'space-x-3'}`}
              >
                {item.icon}
                {!collapsed && <span>{item.name}</span>}
              </Link>
            </li>
          ))}
          
          <li className="mt-6">
            <button
              onClick={logout}
              className={`flex items-center p-3 rounded-lg text-gray-300 hover:bg-blue-700 hover:text-white w-full ${collapsed ? 'justify-center' : 'space-x-3'}`}
            >
              <LogOut size={20} />
              {!collapsed && <span>Logout</span>}
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;