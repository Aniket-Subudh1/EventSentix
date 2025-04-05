import React from 'react';

export const Loader = ({ 
  size = 'md', 
  color = 'white', 
  className 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-4',
    lg: 'w-12 h-12 border-4'
  };
  
  const colorClasses = {
    white: 'border-white',
    blue: 'border-blue-600',
    red: 'border-red-600',
    green: 'border-green-600',
    yellow: 'border-yellow-600',
    gray: 'border-gray-600',
  };
  
  return (
    <div className={`flex justify-center items-center ${className || ''}`}>
      <div
        className={`
          ${sizeClasses[size] || sizeClasses.md}
          ${colorClasses[color] || colorClasses.white}
          border-t-transparent
          rounded-full
          animate-spin
        `}
      ></div>
    </div>
  );
};
