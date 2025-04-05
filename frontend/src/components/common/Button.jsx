import React from 'react';

export const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md', 
  disabled, 
  fullWidth,
  className,
  type = 'button',
  icon,
  ...rest
}) => {
  const variantClasses = {
    primary: 'bg-pink-600 hover:bg-pink-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    success: 'bg-green-500 hover:bg-green-600 text-white',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    warning: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    outline: 'bg-transparent border border-blue-500 text-blue-500 hover:bg-blue-50',
    text: 'bg-transparent text-blue-500 hover:text-blue-700 hover:underline'
  };
  
  // Size styles
  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };
  
  const disabledClasses = disabled 
    ? 'opacity-50 cursor-not-allowed' 
    : 'transition duration-200';
  
  const widthClasses = fullWidth ? 'w-full' : '';
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${variantClasses[variant] || variantClasses.primary}
        ${sizeClasses[size] || sizeClasses.md}
        ${disabledClasses}
        ${widthClasses}
        ${variant !== 'text' ? 'rounded font-medium' : ''}
        flex items-center justify-center
        ${className || ''}
      `}
      {...rest}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};

