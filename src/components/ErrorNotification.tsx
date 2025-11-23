/**
 * ErrorNotification component for displaying query, timeout, and GPT errors
 */

import React, { useEffect, useState } from 'react';
import type { AppError } from '../types';
import { ErrorType } from '../types';
import './ErrorNotification.css';

export interface ErrorNotificationProps {
  error: AppError | null;
  onClose: () => void;
  onRetry?: () => void;
  autoHideDuration?: number; // milliseconds, 0 means no auto-hide
}

export const ErrorNotification: React.FC<ErrorNotificationProps> = ({ 
  error, 
  onClose, 
  onRetry,
  autoHideDuration = 0 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const handleClose = React.useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  useEffect(() => {
    if (error) {
      setIsVisible(true);
      
      if (autoHideDuration > 0) {
        const timer = setTimeout(() => {
          handleClose();
        }, autoHideDuration);
        
        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [error, autoHideDuration, handleClose]);

  if (!error) {
    return null;
  }

  const getErrorIcon = () => {
    switch (error.type) {
      case ErrorType.TIMEOUT_ERROR:
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" strokeWidth="2"/>
            <polyline points="12 6 12 12 16 14" strokeWidth="2"/>
          </svg>
        );
      case ErrorType.GPT_ERROR:
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeWidth="2"/>
            <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2"/>
            <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2"/>
          </svg>
        );
      case ErrorType.VALIDATION_ERROR:
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeWidth="2"/>
            <line x1="12" y1="9" x2="12" y2="13" strokeWidth="2"/>
            <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2"/>
          </svg>
        );
      default: // QUERY_ERROR
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" strokeWidth="2"/>
            <line x1="15" y1="9" x2="9" y2="15" strokeWidth="2"/>
            <line x1="9" y1="9" x2="15" y2="15" strokeWidth="2"/>
          </svg>
        );
    }
  };

  const getErrorTitle = () => {
    switch (error.type) {
      case ErrorType.TIMEOUT_ERROR:
        return 'Query Timeout';
      case ErrorType.GPT_ERROR:
        return 'AI Query Generation Failed';
      case ErrorType.VALIDATION_ERROR:
        return 'Validation Error';
      case ErrorType.QUERY_ERROR:
        return 'Query Error';
      default:
        return 'Error';
    }
  };

  return (
    <div className={`error-notification ${isVisible ? 'error-notification-visible' : ''}`}>
      <div className="error-notification-content">
        <div className="error-notification-icon">
          {getErrorIcon()}
        </div>
        
        <div className="error-notification-text">
          <div className="error-notification-title">{getErrorTitle()}</div>
          <div className="error-notification-message">{error.message}</div>
          
          {error.details && (
            <div className="error-notification-details">
              <details>
                <summary>Details</summary>
                <pre>{typeof error.details === 'string' ? error.details : JSON.stringify(error.details, null, 2)}</pre>
              </details>
            </div>
          )}
        </div>
        
        <div className="error-notification-actions">
          {onRetry && (
            <button 
              className="error-notification-button error-notification-retry" 
              onClick={onRetry}
              aria-label="Retry"
            >
              Retry
            </button>
          )}
          <button 
            className="error-notification-button error-notification-close" 
            onClick={handleClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
};
