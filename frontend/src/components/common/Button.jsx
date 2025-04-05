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
    primary: 'bg-[#9D174D] hover:bg-[#C53070] text-white',
    secondary: 'bg-white/5 hover:bg-[#3D3D3D] text-white border border-[#3D3D3D]',
    success: 'bg-green-500 hover:bg-green-600 text-white',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    warning: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    outline: 'bg-transparent border border-[#9D174D] text-[#9D174D] hover:bg-[#9D174D]/20',
    text: 'bg-transparent text-[#9D174D] hover:text-[#C53070] hover:underline'
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };

  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : 'transition duration-200';
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
