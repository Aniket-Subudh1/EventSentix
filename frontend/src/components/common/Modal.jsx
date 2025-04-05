import React, { useEffect, useRef } from 'react';
import { X } from 'react-feather';

export const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  footer,
  className = ''
}) => {
  const modalRef = useRef(null);
  
  // Handle Escape key press
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent scrolling
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'auto'; // Restore scrolling
    };
  }, [isOpen, onClose]);
  
  // Handle outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  // Size classes
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4'
  };
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div className="fixed inset-0 transition-opacity">
          <div className="absolute inset-0 bg-black opacity-50"></div>
        </div>
        
        <div 
          className={`inline-block align-bottom bg-[#00001A] rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle ${sizeClasses[size] || sizeClasses.md} w-full ${className}`}
          ref={modalRef}
        >
          <div className="bg-[#00001A]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-[#9D174D]/50">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-200 focus:outline-none"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="px-6 py-4 text-white">
              {children}
            </div>
            
            {footer && (
              <div className="px-6 py-4 bg-[#00001A] border-t border-[#9D174D]/50 flex justify-end space-x-2">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
