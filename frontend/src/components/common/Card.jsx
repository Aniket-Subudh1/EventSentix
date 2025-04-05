import React from 'react';

export const Card = ({ 
  children, 
  title, 
  className, 
  headerRight,
  footer,
  noPadding
}) => {
  return (
    <div className={`bg-[#00001A] rounded-lg shadow-lg border border-[#3D3D3D] ${className || ''}`}>
      {title && (
        <div className="flex justify-between items-center p-4 border-b border-[#3D3D3D]">
          <h3 className="font-semibold text-white">{title}</h3>
          {headerRight && <div>{headerRight}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-4'}>
        {children}
      </div>
      {footer && (
        <div className="p-4 border-t border-[#3D3D3D]">
          {footer}
        </div>
      )}
    </div>
  );
};
