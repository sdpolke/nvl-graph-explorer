/**
 * Example usage of TabNavigation component
 * 
 * This file demonstrates how to integrate the TabNavigation component
 * into your application to switch between different views.
 */

import { useState } from 'react';
import { TabNavigation } from './TabNavigation';
// Import other view components as needed (GraphCanvas, ResultsTable, etc.)

export const TabNavigationExample = () => {
  const [activeTab, setActiveTab] = useState<'graph' | 'data' | 'results'>('graph');
  const resultCount = 42; // This would come from your graph data state

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as 'graph' | 'data' | 'results');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tab Navigation */}
      <TabNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        resultCount={resultCount}
      />

      {/* Content Area - conditionally render based on active tab */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'graph' && (
          <div>
            {/* GraphCanvas component would go here */}
            <p>Graph Explorer View</p>
          </div>
        )}

        {activeTab === 'data' && (
          <div>
            {/* ResultsTable component would go here */}
            <p>Data Table View - Showing {resultCount} results</p>
          </div>
        )}

        {activeTab === 'results' && (
          <div>
            {/* Results summary or additional views */}
            <p>Results View</p>
          </div>
        )}
      </div>
    </div>
  );
};
