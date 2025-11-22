import React from 'react';
import type { TabNavigationProps } from '../types';
import './TabNavigation.css';

/**
 * TabNavigation component for switching between different views
 * Provides tabs for Explorer (graph view), Data (table view), and Results
 */
export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  resultCount,
}) => {
  const tabs: Array<{ id: string; label: string; showBadge?: boolean }> = [
    { id: 'graph', label: 'Explorer' },
    { id: 'data', label: 'Data', showBadge: true },
  ];

  return (
    <div className="tab-navigation">
      <div className="tab-list">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            <span className="tab-label">{tab.label}</span>
            {tab.showBadge && resultCount > 0 && (
              <span className="tab-badge">{resultCount}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
