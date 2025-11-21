import React, { useState } from 'react';
import type { SearchBarProps } from '../types';
import './SearchBar.css';

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading }) => {
  const [searchText, setSearchText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchText.trim() && !isLoading) {
      onSearch(searchText.trim(), 'natural');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  return (
    <div className="search-bar">
      <form onSubmit={handleSubmit} className="search-form">
        <input
          type="text"
          className="search-input"
          placeholder="Ask a question in natural language (e.g., 'Show me genes related to cancer')"
          value={searchText}
          onChange={handleInputChange}
          disabled={isLoading}
        />
        <button
          type="submit"
          className="search-button"
          disabled={isLoading || !searchText.trim()}
        >
          {isLoading ? (
            <span className="loading-indicator">
              <span className="spinner"></span>
              Searching...
            </span>
          ) : (
            'Search'
          )}
        </button>
      </form>
    </div>
  );
};
