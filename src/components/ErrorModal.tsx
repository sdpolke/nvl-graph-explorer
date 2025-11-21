/**
 * ErrorModal component for displaying connection errors
 */

import React from 'react';
import type { AppError } from '../types';
import './ErrorModal.css';

export interface ErrorModalProps {
  error: AppError | null;
  onClose: () => void;
  onRetry?: () => void;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({ error, onClose, onRetry }) => {
  if (!error) {
    return null;
  }

  return (
    <div className="error-modal-overlay" onClick={onClose}>
      <div className="error-modal" onClick={(e) => e.stopPropagation()}>
        <div className="error-modal-header">
          <h2>Connection Error</h2>
          <button className="error-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        
        <div className="error-modal-body">
          <div className="error-modal-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" strokeWidth="2"/>
              <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2"/>
              <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2"/>
            </svg>
          </div>
          
          <p className="error-modal-message">{error.message}</p>
          
          {error.details && (
            <div className="error-modal-details">
              <details>
                <summary>Technical Details</summary>
                <pre>{JSON.stringify(error.details, null, 2)}</pre>
              </details>
            </div>
          )}
        </div>
        
        <div className="error-modal-footer">
          {onRetry && (
            <button className="error-modal-button error-modal-button-retry" onClick={onRetry}>
              Retry Connection
            </button>
          )}
          <button className="error-modal-button error-modal-button-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
