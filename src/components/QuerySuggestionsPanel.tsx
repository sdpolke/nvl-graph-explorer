import React, { useRef, useEffect, useCallback, forwardRef } from 'react';
import { ChevronRight, ChevronDown, Loader2, AlertCircle, Search } from 'lucide-react';
import { useQuerySuggestions } from '../hooks/useQuerySuggestions';
import { QuerySuggestionItem } from './QuerySuggestionItem';
import type { QuerySuggestionsPanelProps } from '../types';
import './QuerySuggestionsPanel.css';

export const QuerySuggestionsPanel = forwardRef<HTMLDivElement, QuerySuggestionsPanelProps>(({
  onQuerySelect,
  isExecuting,
  activeQuery,
}, scrollRef) => {
  const { suggestions, isLoading, error } = useQuerySuggestions();
  const [focusedIndex, setFocusedIndex] = React.useState<number>(-1);
  const [collapsedCategories, setCollapsedCategories] = React.useState<Set<string>>(new Set());
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const nonEmptyCategories = suggestions.filter(cat => cat.suggestions.length > 0);
  const sortedCategories = [...nonEmptyCategories].sort((a, b) => a.order - b.order);

  const allSuggestions = sortedCategories
    .filter(cat => !collapsedCategories.has(cat.id))
    .flatMap(cat => cat.suggestions);

  const toggleCategory = useCallback((categoryId: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (isExecuting || allSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = prev < allSuggestions.length - 1 ? prev + 1 : 0;
          return next;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = prev > 0 ? prev - 1 : allSuggestions.length - 1;
          return next;
        });
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(allSuggestions.length - 1);
        break;
    }
  }, [isExecuting, allSuggestions.length]);

  useEffect(() => {
    if (focusedIndex >= 0 && suggestionRefs.current[focusedIndex]) {
      suggestionRefs.current[focusedIndex]?.focus();
    }
  }, [focusedIndex]);

  if (isLoading) {
    return (
      <div className="query-suggestions-panel">
        <div className="query-suggestions-loading">
          <Loader2 className="loading-spinner" size={32} />
          <p>Loading suggestions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="query-suggestions-panel">
        <div className="query-suggestions-error">
          <AlertCircle className="error-icon" size={32} />
          <p>Unable to load suggestions</p>
          <span className="error-details">{error}</span>
        </div>
      </div>
    );
  }

  if (sortedCategories.length === 0) {
    return (
      <div 
        className="query-suggestions-panel"
        role="region"
        aria-label="Query suggestions"
      >
        <div 
          className="query-suggestions-empty"
          role="status"
          aria-live="polite"
        >
          <Search className="empty-icon" size={40} />
          <p>No suggestions available</p>
          <span className="empty-hint">Check configuration</span>
        </div>
      </div>
    );
  }

  let suggestionIndex = 0;

  return (
    <nav 
      className="query-suggestions-panel"
      role="navigation"
      aria-label="Query suggestions"
      onKeyDown={handleKeyDown}
    >
      <div ref={scrollRef} className="query-suggestions-content">
        {/* Screen reader announcement for state changes */}
        <div 
          className="sr-only" 
          role="status" 
          aria-live="polite"
          aria-atomic="true"
        >
          {isExecuting && activeQuery && `Executing query: ${activeQuery}`}
          {!isExecuting && activeQuery && `Query completed: ${activeQuery}`}
        </div>

        {sortedCategories.map(category => {
          const isCollapsed = collapsedCategories.has(category.id);
          return (
            <section 
              key={category.id} 
              className="query-category"
              aria-labelledby={`category-${category.id}`}
            >
              <button
                className="category-header"
                onClick={() => toggleCategory(category.id)}
                aria-expanded={!isCollapsed}
                aria-controls={`category-content-${category.id}`}
              >
                {isCollapsed ? (
                  <ChevronRight className="category-expand-icon" size={14} />
                ) : (
                  <ChevronDown className="category-expand-icon" size={14} />
                )}
                <h3 id={`category-${category.id}`} className="category-name">
                  {category.name}
                </h3>
                {category.description && (
                  <span className="sr-only">{category.description}</span>
                )}
              </button>
              <div 
                id={`category-content-${category.id}`}
                className={`category-suggestions ${isCollapsed ? 'collapsed' : ''}`}
                role="list"
                aria-label={`${category.name} suggestions`}
                aria-hidden={isCollapsed}
              >
                {category.suggestions.map(suggestion => {
                  const currentIndex = suggestionIndex++;
                  return (
                    <QuerySuggestionItem
                      key={suggestion.id}
                      ref={(el) => { suggestionRefs.current[currentIndex] = el; }}
                      suggestion={suggestion}
                      isActive={activeQuery === suggestion.query}
                      isExecuting={isExecuting}
                      onClick={() => onQuerySelect(suggestion.query)}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </nav>
  );
});

QuerySuggestionsPanel.displayName = 'QuerySuggestionsPanel';
