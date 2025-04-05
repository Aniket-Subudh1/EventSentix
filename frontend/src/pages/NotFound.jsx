import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Home } from 'react-feather';
import { Button } from '../components/common/Button';

const NotFound = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="flex justify-center">
          <div className="p-6 bg-red-100 rounded-full">
            <AlertCircle size={48} className="text-red-600" />
          </div>
        </div>
        
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Page Not Found
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sorry, the page you are looking for doesn't exist or has been moved.
          </p>
        </div>
        
        <div className="flex flex-col space-y-4">
          <Link to="/dashboard" className="w-full">
            <Button
              variant="primary"
              fullWidth
              icon={<Home size={16} className="mr-2" />}
            >
              Go to Dashboard
            </Button>
          </Link>
          
          <Link to="/events" className="w-full">
            <Button
              variant="secondary"
              fullWidth
            >
              View Events
            </Button>
          </Link>
        </div>
        
        <div className="border-t pt-6 text-center">
          <p className="text-sm text-gray-500">
            Error 404: The requested page could not be found.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;