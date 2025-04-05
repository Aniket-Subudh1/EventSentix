import React from 'react';

export const Loader = ({ 
  size = 'md', 
  color = 'blue', 
  className 
}) => {
  // Size styles
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3'
  };
  
  // Color styles
  const colorClasses = {
    blue: 'border-blue-600',
    red: 'border-red-600',
    green: 'border-green-600',
    yellow: 'border-yellow-600',
    gray: 'border-gray-600',
    white: 'border-white'
  };
  
  return (
    <div className={`flex justify-center items-center ${className || ''}`}>
      <div
        className={`
          ${sizeClasses[size] || sizeClasses.md}
          ${colorClasses[color] || colorClasses.blue}
          border-t-transparent
          rounded-full
          animate-spin
        `}
      ></div>
    </div>
  );
};