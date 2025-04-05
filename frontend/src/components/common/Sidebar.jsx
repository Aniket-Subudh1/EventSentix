import React, { useContext, useEffect, useState } from 'react';
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
  Users,
  ChevronLeft,
  ChevronRight
} from 'react-feather';

const Sidebar = ({ collapsed, setCollapsed }) => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState(null);
  
  const isActive = (path) => {
    return location.pathname === path
      ? 'bg-[#C53070] text-white'                  
      : 'text-gray-300 hover:bg-[#9D174D]/20 hover:text-white'; 
  };

  const menuItems = [
    { path: '/dashboard', name: 'Dashboard', icon: <Home size={20} />, access: ['admin', 'organizer', 'staff'] },
    { path: '/events', name: 'Events', icon: <Calendar size={20} />, access: ['admin', 'organizer', 'staff'] },
    { path: '/feedback', name: 'Feedback', icon: <MessageCircle size={20} />, access: ['admin', 'organizer', 'staff'] },
    { path: '/alerts', name: 'Alerts', icon: <Bell size={20} />, access: ['admin', 'organizer', 'staff'] },
    { path: '/analytics', name: 'Analytics', icon: <BarChart2 size={20} />, access: ['admin', 'organizer'] },
    { path: '/integrations', name: 'Integrations', icon: <Share2 size={20} />, access: ['admin', 'organizer'] },
    { path: '/users', name: 'User Management', icon: <Users size={20} />, access: ['admin'] },
    { path: '/settings', name: 'Settings', icon: <Settings size={20} />, access: ['admin', 'organizer', 'staff'] },
  ];

  // Filter menu items by user role
  const filteredMenuItems = menuItems.filter(
    item => user && item.access.includes(user.role)
  );

  // Animate the sidebar on load + auto collapse on mobile
  useEffect(() => {
    const sidebarElement = document.getElementById('sidebar');
    if (sidebarElement) {
      sidebarElement.classList.add('animate-fade-in');
    }
    
    const handleResize = () => {
      if (window.innerWidth < 768 && !collapsed) {
        setCollapsed(true);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // check on initial load
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [collapsed, setCollapsed]);

  return (
    <div 
      id="sidebar"
      className={`
        bg-[#00001A] text-white h-screen transition-all duration-300 ease-in-out
        border-r border-[#3D3D3D] shadow-xl flex flex-col hover:shadow-2xl
        ${collapsed ? 'w-20' : 'w-64'}
      `}
    >
      {/* Top brand area */}
      <div className="p-4 flex justify-between items-center">
        {!collapsed && (
          <h1 className="text-xl font-bold bg-gradient-to-r from-[#9D174D] to-[#C53070] bg-clip-text text-transparent">
            EventSentix
          </h1>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className={`
            p-2 rounded-full
            hover:bg-[#9D174D]/20
            transition-all duration-300 transform hover:scale-110
            text-[#C53070] hover:text-white
          `}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
      
      {/* Main menu area */}
      <div className={`flex-grow overflow-y-auto ${collapsed ? '' : 'ml-5'} scrollbar-thin scrollbar-thumb-[#3D3D3D] scrollbar-track-transparent`}>
        {/* User Info */}
        {user && (
          <div className={`px-4 py-3 ${collapsed ? 'text-center' : 'flex items-center space-x-3'}`}>
            <div className="h-10 w-10 rounded-full bg-[#9D174D] flex items-center justify-center text-white shadow-lg transform hover:scale-110 border border-[#C53070]">
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            {!collapsed && (
              <div className="animate-slide-in">
                <p className="font-medium text-white">{user.name}</p>
                <p className="text-xs text-gray-400 capitalize">{user.role}</p>
              </div>
            )}
          </div>
        )}
        
        {/* Menu Items */}
        <ul className="mt-6 space-y-2 px-2">
          {filteredMenuItems.map((item, index) => (
            <li 
              key={item.path}
              style={{ animationDelay: `${index * 50}ms` }}
              className="animate-slide-in relative"
              onMouseEnter={() => collapsed && setHoveredItem(item.path)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <Link
                to={item.path}
                className={`
                  flex items-center p-3 rounded-lg
                  ${isActive(item.path)}
                  ${collapsed ? 'justify-center' : 'space-x-3'}
                  transition-all duration-300
                `}
              >
                {/* Icon coloring depends on active state */}
                <span className={
                  location.pathname === item.path
                    ? 'text-white'
                    : 'text-[#C53070]'
                }>
                  {item.icon}
                </span>
                {/* Show name if not collapsed */}
                {!collapsed && <span>{item.name}</span>}
              </Link>
              
              {/* Tooltip for collapsed sidebar */}
              {collapsed && hoveredItem === item.path && (
                <div className="
                  absolute left-full ml-2 top-1/2 transform -translate-y-1/2
                  bg-[#00001A] text-white text-sm rounded-md px-2 py-1 z-10
                  whitespace-nowrap border border-[#3D3D3D] shadow-xl
                  animate-fade-in
                ">
                  {item.name}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
      
      {/* Logout */}
      <div className="p-3 border-t border-[#3D3D3D] mt-auto">
        <button
          onClick={logout}
          className={`
            flex items-center p-3 rounded-lg
            text-gray-300 hover:bg-[#9D174D]/20 hover:text-white w-full
            ${collapsed ? 'justify-center' : 'space-x-3'}
            transition-all duration-300
          `}
        >
          <LogOut size={20} className="text-red-400" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
};
 
export default Sidebar;
