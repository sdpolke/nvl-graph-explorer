import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { QueryPanelProps } from '../types';
import './QueryPanel.css';

export const QueryPanel: React.FC<QueryPanelProps> = ({
  query,
  onQueryChange,
  onExecute,
  onStop,
  isExecuting,
}) => {
  const [localQuery, setLocalQuery] = useState(query);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Update local query when prop changes (e.g., from natural language search)
  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  const validateQuery = (queryText: string): boolean => {
    const trimmedQuery = queryText.trim();
    
    if (!trimmedQuery) {
      setValidationError('Query cannot be empty');
      return false;
    }

    // Basic Cypher validation - check for common keywords
    const cypherKeywords = /\b(MATCH|CREATE|MERGE|DELETE|REMOVE|SET|RETURN|WITH|WHERE|ORDER BY|LIMIT|SKIP|UNION|UNWIND|CALL|OPTIONAL MATCH)\b/i;
    
    if (!cypherKeywords.test(trimmedQuery)) {
      setValidationError('Query does not appear to be valid Cypher syntax');
      return false;
    }

    setValidationError(null);
    return true;
  };

  const handleExecute = () => {
    if (validateQuery(localQuery)) {
      onExecute();
    }
  };

  return (
    <div className="query-panel">
      <div className="query-editor-container">
        <input
          type="text"
          className="query-input"
          value={localQuery}
          onChange={(e) => {
            const newQuery = e.target.value;
            setLocalQuery(newQuery);
            onQueryChange(newQuery);
            if (validationError) setValidationError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isExecuting) {
              e.preventDefault();
              handleExecute();
            }
          }}
          placeholder="Enter Cypher query... (Press Enter to execute)"
          disabled={isExecuting}
          spellCheck={false}
        />
        
        {isExecuting && (
          <button
            className="stop-query-button"
            onClick={onStop}
            title="Stop Query"
            aria-label="Stop Query"
          >
            <X size={20} />
            <span>Stop</span>
          </button>
        )}
        
        {validationError && (
          <div className="validation-error">
            <span className="error-icon">⚠</span>
            {validationError}
          </div>
        )}
      </div>
    </div>
  );
};
