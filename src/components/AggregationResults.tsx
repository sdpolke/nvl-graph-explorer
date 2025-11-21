import React from 'react';
import './AggregationResults.css';

interface AggregationResultsProps {
  results: Record<string, any>[];
  onClose: () => void;
}

export const AggregationResults: React.FC<AggregationResultsProps> = ({ results, onClose }) => {
  return (
    <div className="aggregation-results-overlay">
      <div className="aggregation-results-panel">
        <div className="aggregation-results-header">
          <h3>Query Results</h3>
          <button 
            className="close-button" 
            onClick={onClose}
            aria-label="Close results"
          >
            ×
          </button>
        </div>
        
        <div className="aggregation-results-content">
          {results.map((result, index) => (
            <div key={index} className="result-row">
              {Object.entries(result).map(([key, value]) => (
                <div key={key} className="result-item">
                  <span className="result-key">{key}:</span>
                  <span className="result-value">{String(value)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
