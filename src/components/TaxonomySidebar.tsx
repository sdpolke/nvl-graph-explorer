import React, { useState, useRef, useEffect } from 'react';
import { Network, Sparkles } from 'lucide-react';
import type { TaxonomySidebarProps } from '../types';
import { nodeStyleConfig } from '../utils/styleConfig';
import { QuerySuggestionsPanel } from './QuerySuggestionsPanel';
import './TaxonomySidebar.css';

type TabType = 'nodeTypes' | 'queries';

export const TaxonomySidebar: React.FC<TaxonomySidebarProps> = ({
  labels,
  selectedLabels,
  onLabelToggle,
  nodeCounts,
  onQuerySelect,
  isQueryExecuting,
  activeQuery = null,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('nodeTypes');
  const [scrollPositions, setScrollPositions] = useState<Record<TabType, number>>({
    nodeTypes: 0,
    queries: 0,
  });
  
  const nodeTypesScrollRef = useRef<HTMLDivElement>(null);
  const queriesScrollRef = useRef<HTMLDivElement>(null);

  const handleToggle = (label: string) => {
    onLabelToggle(label);
  };

  const handleSelectAll = () => {
    // If all are selected, deselect all; otherwise select all
    if (selectedLabels.length === labels.length) {
      labels.forEach(label => {
        if (selectedLabels.includes(label)) {
          onLabelToggle(label);
        }
      });
    } else {
      labels.forEach(label => {
        if (!selectedLabels.includes(label)) {
          onLabelToggle(label);
        }
      });
    }
  };

  const handleTabSwitch = (newTab: TabType) => {
    // Save current scroll position before switching
    const currentScrollRef = activeTab === 'nodeTypes' ? nodeTypesScrollRef : queriesScrollRef;
    if (currentScrollRef.current) {
      setScrollPositions(prev => ({
        ...prev,
        [activeTab]: currentScrollRef.current!.scrollTop,
      }));
    }
    
    setActiveTab(newTab);
  };

  // Restore scroll position when tab changes
  useEffect(() => {
    const targetScrollRef = activeTab === 'nodeTypes' ? nodeTypesScrollRef : queriesScrollRef;
    if (targetScrollRef.current) {
      targetScrollRef.current.scrollTop = scrollPositions[activeTab];
    }
  }, [activeTab, scrollPositions]);

  const allSelected = selectedLabels.length === labels.length;

  const handleIconClick = (tab: TabType) => {
    if (isCollapsed) {
      setIsCollapsed(false);
    }
    handleTabSwitch(tab);
  };

  return (
    <aside 
      className={`taxonomy-sidebar ${isCollapsed ? 'collapsed' : ''}`}
      aria-label="Sidebar navigation"
    >
      <div className="sidebar-icon-bar">
        <button
          className={`icon-tab ${activeTab === 'nodeTypes' ? 'active' : ''}`}
          onClick={() => handleIconClick('nodeTypes')}
          role="tab"
          aria-label="Node Types"
          aria-selected={activeTab === 'nodeTypes'}
          aria-controls="nodeTypes-panel"
          id="nodeTypes-tab"
          title="Node Types"
        >
          <Network size={20} />
        </button>
        <button
          className={`icon-tab ${activeTab === 'queries' ? 'active' : ''}`}
          onClick={() => handleIconClick('queries')}
          role="tab"
          aria-label="Suggested Queries"
          aria-selected={activeTab === 'queries'}
          aria-controls="queries-panel"
          id="queries-tab"
          title="Suggested Queries"
        >
          <Sparkles size={20} />
        </button>
      </div>

      {!isCollapsed && (
        <div className="sidebar-content-wrapper">
          <div className="taxonomy-header">
            <h3 className="taxonomy-title">
              {activeTab === 'nodeTypes' ? 'Node Types' : 'Suggested Queries'}
            </h3>
            <button
              className="collapse-button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!isCollapsed}
            >
              {isCollapsed ? '›' : '‹'}
            </button>
          </div>

          <div className="taxonomy-content">
          {activeTab === 'nodeTypes' && (
            <div
              role="tabpanel"
              id="nodeTypes-panel"
              aria-labelledby="nodeTypes-tab"
            >
              <div className="taxonomy-controls">
                <button
                  className="select-all-button"
                  onClick={handleSelectAll}
                  aria-label={allSelected ? 'Deselect all node types' : 'Select all node types'}
                >
                  {allSelected ? 'Deselect All' : 'Select All'}
                </button>
                <span 
                  className="selected-count"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {selectedLabels.length} of {labels.length} selected
                </span>
              </div>

              <div 
                ref={nodeTypesScrollRef}
                className="taxonomy-list"
                role="group"
                aria-label="Node type filters"
              >
                {labels.map(label => {
                  const count = nodeCounts[label] || 0;
                  const isSelected = selectedLabels.includes(label);
                  const nodeColor = nodeStyleConfig[label]?.color || nodeStyleConfig.default.color;

                  return (
                    <label
                      key={label}
                      className={`taxonomy-item ${isSelected ? 'selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggle(label)}
                        className="taxonomy-checkbox"
                        aria-label={`${label}, ${count} nodes`}
                      />
                      <span 
                        className="taxonomy-color-indicator"
                        style={{ backgroundColor: nodeColor }}
                        aria-hidden="true"
                      />
                      <span className="taxonomy-label">{label}</span>
                      <span className="taxonomy-count" aria-label={`${count} nodes`}>{count}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'queries' && (
            <div
              role="tabpanel"
              id="queries-panel"
              aria-labelledby="queries-tab"
              className="queries-tabpanel"
            >
              <QuerySuggestionsPanel
                ref={queriesScrollRef}
                onQuerySelect={onQuerySelect}
                isExecuting={isQueryExecuting}
                activeQuery={activeQuery}
              />
            </div>
          )}
          </div>
        </div>
      )}
    </aside>
  );
};
