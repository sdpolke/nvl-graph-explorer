import { useState, useEffect, useCallback, useRef } from 'react';
import type { QuerySuggestionCategory, UseQuerySuggestionsReturn } from '../types';

interface QuerySuggestionsData {
  version: string;
  description: string;
  categories: QuerySuggestionCategory[];
}

const CACHE_KEY = 'query-suggestions-cache';
const CACHE_VERSION_KEY = 'query-suggestions-version';

/**
 * Custom hook for loading and managing query suggestions from JSON configuration
 * 
 * Features:
 * - Loads suggestions from src/data/querySuggestions.json
 * - Handles malformed JSON with graceful error handling
 * - Implements caching mechanism to avoid redundant loads
 * - Provides loading states for UI feedback
 * - Validates JSON structure before returning data
 * 
 * @returns {UseQuerySuggestionsReturn} Suggestions data, loading state, error state, and reload function
 */
export function useQuerySuggestions(): UseQuerySuggestionsReturn {
  const [suggestions, setSuggestions] = useState<QuerySuggestionCategory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<QuerySuggestionCategory[] | null>(null);
  const loadAttemptedRef = useRef<boolean>(false);

  const validateSuggestionData = useCallback((data: any): data is QuerySuggestionsData => {
    if (!data || typeof data !== 'object') return false;
    if (!Array.isArray(data.categories)) return false;
    
    return data.categories.every((category: any) => {
      if (!category.id || !category.name || typeof category.order !== 'number') return false;
      if (!Array.isArray(category.suggestions)) return false;
      
      return category.suggestions.every((suggestion: any) => {
        return (
          suggestion.id &&
          suggestion.query &&
          suggestion.complexity &&
          ['basic', 'intermediate', 'advanced'].includes(suggestion.complexity)
        );
      });
    });
  }, []);

  const loadFromCache = useCallback((): QuerySuggestionCategory[] | null => {
    try {
      const cachedData = sessionStorage.getItem(CACHE_KEY);
      const cachedVersion = sessionStorage.getItem(CACHE_VERSION_KEY);
      
      if (cachedData && cachedVersion) {
        const parsed = JSON.parse(cachedData);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Failed to load from cache:', err);
    }
    return null;
  }, []);

  const saveToCache = useCallback((data: QuerySuggestionCategory[], version: string) => {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
      sessionStorage.setItem(CACHE_VERSION_KEY, version);
    } catch (err) {
      console.warn('Failed to save to cache:', err);
    }
  }, []);

  const loadSuggestions = useCallback(async () => {
    if (cacheRef.current) {
      setSuggestions(cacheRef.current);
      setIsLoading(false);
      return;
    }

    const cached = loadFromCache();
    if (cached) {
      cacheRef.current = cached;
      setSuggestions(cached);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/src/data/querySuggestions.json');
      
      if (!response.ok) {
        throw new Error(`Failed to load suggestions: ${response.status} ${response.statusText}`);
      }

      const text = await response.text();
      let data: any;
      
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error('Malformed JSON in query suggestions file');
      }

      if (!validateSuggestionData(data)) {
        console.error('Invalid suggestion data structure:', data);
        throw new Error('Invalid query suggestions data structure');
      }

      const sortedCategories = [...data.categories].sort((a, b) => a.order - b.order);
      
      cacheRef.current = sortedCategories;
      saveToCache(sortedCategories, data.version || '1.0');
      setSuggestions(sortedCategories);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error loading suggestions';
      console.error('Error loading query suggestions:', err);
      setError(errorMessage);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [loadFromCache, saveToCache, validateSuggestionData]);

  const reload = useCallback(async () => {
    cacheRef.current = null;
    try {
      sessionStorage.removeItem(CACHE_KEY);
      sessionStorage.removeItem(CACHE_VERSION_KEY);
    } catch (err) {
      console.warn('Failed to clear cache:', err);
    }
    await loadSuggestions();
  }, [loadSuggestions]);

  useEffect(() => {
    if (!loadAttemptedRef.current) {
      loadAttemptedRef.current = true;
      loadSuggestions();
    }
  }, [loadSuggestions]);

  return {
    suggestions,
    isLoading,
    error,
    reload,
  };
}
