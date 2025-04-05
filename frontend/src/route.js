import React from 'react';
import { Navigate } from 'react-router-dom';


import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import Feedback from './pages/Feedback';
import Alerts from './pages/Alerts';
import Analytics from './pages/Analytics';
import Integrations from './pages/Integrations';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import EngagementLanding from './pages/EngagementLanding';


import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

import authService from './services/authService';


const ProtectedRoute = ({ children }) => {
  const isAuthenticated = authService.isAuthenticated();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return children;
};


const routes = [
 
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '/register',
    element: <Register />
  },
  
  {
    path: '/',
    element: <ProtectedRoute><Navigate to="/dashboard" /></ProtectedRoute>
  },
  {
    path: '/dashboard',
    element: <ProtectedRoute><Dashboard /></ProtectedRoute>
  },
  {
    path: '/events',
    element: <ProtectedRoute><Events /></ProtectedRoute>
  },
  {
    path: '/feedback',
    element: <ProtectedRoute><Feedback /></ProtectedRoute>
  },
  {
    path: '/alerts',
    element: <ProtectedRoute><Alerts /></ProtectedRoute>
  },
  {
    path: '/analytics',
    element: <ProtectedRoute><Analytics /></ProtectedRoute>
  },
  {
    path: '/integrations',
    element: <ProtectedRoute><Integrations /></ProtectedRoute>
  },
  {
    path: '/settings',
    element: <ProtectedRoute><Settings /></ProtectedRoute>
  },
  {
    path: '/event/:eventId/engage',
    element: <EngagementLanding />
  },
  {
    path: '*',
    element: <NotFound />
  }
];

export default routes;