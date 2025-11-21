import React, { useState } from 'react';
import type { TaxonomySidebarProps } from '../types';
import { nodeStyleConfig } from '../utils/styleConfig';
import './TaxonomySidebar.css';

export const TaxonomySidebar: React.FC<TaxonomySidebarProps> = ({
  labels,
  selectedLabels,
  onLabelToggle,
  nodeCounts,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

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

  const allSelected = selectedLabels.length === labels.length;

  return (
    <aside className={`taxonomy-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="taxonomy-header">
        <h3>Node Types</h3>
        <button
          className="collapse-button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? '›' : '‹'}
        </button>
      </div>

      {!isCollapsed && (
        <div className="taxonomy-content">
          <div className="taxonomy-controls">
            <button
              className="select-all-button"
              onClick={handleSelectAll}
            >
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
            <span className="selected-count">
              {selectedLabels.length} of {labels.length} selected
            </span>
          </div>

          <div className="taxonomy-list">
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
                  />
                  <span 
                    className="taxonomy-color-indicator"
                    style={{ backgroundColor: nodeColor }}
                  />
                  <span className="taxonomy-label">{label}</span>
                  <span className="taxonomy-count">{count}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
};
