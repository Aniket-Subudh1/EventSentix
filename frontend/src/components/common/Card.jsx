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
    <div className={`bg-white rounded-lg shadow ${className || ''}`}>
      {title && (
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-semibold">{title}</h3>
          {headerRight && <div>{headerRight}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-4'}>
        {children}
      </div>
      {footer && (
        <div className="p-4 border-t">
          {footer}
        </div>
      )}
    </div>
  );
};