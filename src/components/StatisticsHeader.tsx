import React, { useState, useRef, useEffect } from 'react';
import './StatisticsHeader.css';

interface StatisticsHeaderProps {
  onRefresh: () => void;
  onExport: (format: 'csv' | 'json') => void;
  isLoading: boolean;
  lastUpdated: Date | null;
  totalNodes?: number;
  totalNodeTypes?: number;
}

export const StatisticsHeader: React.FC<StatisticsHeaderProps> = ({
  onRefresh,
  onExport,
  isLoading,
  lastUpdated,
  totalNodes = 0,
  totalNodeTypes = 0,
}) => {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsExportOpen(false);
      }
    };

    if (isExportOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExportOpen]);

  const handleExportClick = (format: 'csv' | 'json') => {
    onExport(format);
    setIsExportOpen(false);
  };

  const formatLastUpdated = (date: Date | null): string => {
    if (!date) return 'Never';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;

    return date.toLocaleString();
  };

  return (
    <header 
      className="statistics-header"
      role="banner"
    >
      <div className="statistics-header-top">
        <div className="statistics-header-left">
          <h2 className="statistics-title" id="dashboard-title">Statistics Dashboard</h2>
          <span 
            className="statistics-last-updated"
            role="status"
            aria-live="polite"
            aria-label={`Last updated ${formatLastUpdated(lastUpdated)}`}
          >
            Last updated: {formatLastUpdated(lastUpdated)}
          </span>
        </div>

        <div className="statistics-header-right" role="toolbar" aria-label="Statistics actions">
          <button
            className="statistics-refresh-button"
            onClick={onRefresh}
            disabled={isLoading}
            aria-label={isLoading ? 'Refreshing statistics' : 'Refresh statistics'}
            aria-busy={isLoading}
            type="button"
          >
            <svg
              className={`refresh-icon ${isLoading ? 'spinning' : ''}`}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
            </svg>
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>

          <div className="statistics-export-dropdown" ref={dropdownRef}>
            <button
              className="statistics-export-button"
              onClick={() => setIsExportOpen(!isExportOpen)}
              aria-label="Export statistics menu"
              aria-expanded={isExportOpen}
              aria-haspopup="menu"
              aria-controls="export-menu"
              type="button"
            >
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Export
              <svg
                className={`dropdown-arrow ${isExportOpen ? 'open' : ''}`}
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {isExportOpen && (
              <div 
                className="export-dropdown-menu"
                id="export-menu"
                role="menu"
                aria-label="Export options"
              >
                <button
                  className="export-option"
                  onClick={() => handleExportClick('csv')}
                  role="menuitem"
                  aria-label="Export statistics as CSV file"
                  type="button"
                >
                  <svg 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                  </svg>
                  Export as CSV
                </button>
                <button
                  className="export-option"
                  onClick={() => handleExportClick('json')}
                  role="menuitem"
                  aria-label="Export statistics as JSON file"
                  type="button"
                >
                  <svg 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6M10 12h4M10 16h4" />
                  </svg>
                  Export as JSON
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div 
        className="statistics-summary"
        role="region"
        aria-label="Statistics summary"
      >
        <div className="summary-item" role="group" aria-label="Total nodes count">
          <span className="summary-icon" aria-hidden="true">●</span>
          <span className="summary-value" aria-label={`${totalNodes.toLocaleString()} total nodes`}>
            {totalNodes.toLocaleString()}
          </span>
          <span className="summary-label">Total Nodes</span>
        </div>
        <div className="summary-divider" aria-hidden="true">|</div>
        <div className="summary-item" role="group" aria-label="Node types count">
          <span className="summary-icon" aria-hidden="true">◆</span>
          <span className="summary-value" aria-label={`${totalNodeTypes.toLocaleString()} node types`}>
            {totalNodeTypes.toLocaleString()}
          </span>
          <span className="summary-label">Node Types</span>
        </div>
      </div>
    </header>
  );
};
