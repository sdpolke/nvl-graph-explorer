import { useCallback, forwardRef } from 'react';
import type { QuerySuggestionItemProps } from '../types';
import './QuerySuggestionItem.css';

export const QuerySuggestionItem = forwardRef<HTMLDivElement, QuerySuggestionItemProps>(({
  suggestion,
  isActive,
  isExecuting,
  onClick,
}, ref) => {
  const handleClick = useCallback(() => {
    if (!isExecuting) {
      onClick();
    }
  }, [isExecuting, onClick]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !isExecuting) {
      e.preventDefault();
      onClick();
    }
  }, [isExecuting, onClick]);

  const classNames = [
    'query-suggestion-item',
    isActive && 'active',
    isExecuting && 'executing',
    isExecuting && 'disabled',
  ].filter(Boolean).join(' ');

  const ariaLabel = [
    suggestion.query,
    suggestion.description && `- ${suggestion.description}`,
    `Complexity: ${suggestion.complexity}`,
    isActive && 'Currently active',
    isExecuting && 'Executing',
  ].filter(Boolean).join('. ');

  return (
    <div
      ref={ref}
      className={classNames}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="listitem"
      tabIndex={isExecuting ? -1 : 0}
      aria-label={ariaLabel}
      aria-disabled={isExecuting}
      aria-current={isActive ? 'true' : undefined}
    >
      <div className="suggestion-content">
        <div className="suggestion-text">
          <div className="suggestion-query">
            {suggestion.query}
          </div>
          {suggestion.description && (
            <div className="suggestion-description" id={`desc-${suggestion.id}`}>
              {suggestion.description}
            </div>
          )}
          <div className="suggestion-meta">
            <span 
              className={`complexity-badge ${suggestion.complexity}`}
              aria-label={`Complexity level: ${suggestion.complexity}`}
            >
              {suggestion.complexity}
            </span>
          </div>
        </div>
        {isExecuting && isActive && (
          <div 
            className="loading-indicator"
            role="status"
            aria-label="Executing query"
          />
        )}
      </div>
    </div>
  );
});

QuerySuggestionItem.displayName = 'QuerySuggestionItem';
