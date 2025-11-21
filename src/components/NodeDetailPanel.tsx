import React, { useMemo } from 'react';
import type { NodeDetailPanelProps, Relationship } from '../types';
import { useGraphData } from '../context/GraphContext';
import './NodeDetailPanel.css';

/**
 * NodeDetailPanel component - Displays detailed information about a selected node
 * 
 * Features:
 * - Shows node labels and all properties
 * - Displays relationship summary (count by type)
 * - Provides action buttons (expand, hide, close)
 */
export const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({ node, onClose }) => {
  const { graphData } = useGraphData();

  // Calculate relationship summary for the selected node
  const relationshipSummary = useMemo(() => {
    if (!node) return {};

    const summary: Record<string, { incoming: number; outgoing: number }> = {};

    graphData.relationships.forEach((rel: Relationship) => {
      if (rel.startNodeId === node.id) {
        // Outgoing relationship
        if (!summary[rel.type]) {
          summary[rel.type] = { incoming: 0, outgoing: 0 };
        }
        summary[rel.type].outgoing += 1;
      } else if (rel.endNodeId === node.id) {
        // Incoming relationship
        if (!summary[rel.type]) {
          summary[rel.type] = { incoming: 0, outgoing: 0 };
        }
        summary[rel.type].incoming += 1;
      }
    });

    return summary;
  }, [node, graphData.relationships]);

  // Don't render if no node is selected
  if (!node) {
    return null;
  }

  // Format property values for display
  const formatPropertyValue = (value: any): string => {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  return (
    <div className="node-detail-panel">
      <div className="node-detail-header">
        <h3>Node Details</h3>
        <button 
          className="close-button" 
          onClick={onClose}
          aria-label="Close panel"
        >
          ×
        </button>
      </div>

      <div className="node-detail-content">
        {/* Node ID */}
        <div className="detail-section">
          <h4>ID</h4>
          <div className="detail-value node-id">{node.id}</div>
        </div>

        {/* Node Labels */}
        <div className="detail-section">
          <h4>Labels</h4>
          <div className="labels-container">
            {node.labels.map((label, index) => (
              <span key={index} className="label-badge">
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Node Properties */}
        <div className="detail-section">
          <h4>Properties</h4>
          <div className="properties-list">
            {Object.keys(node.properties).length > 0 ? (
              Object.entries(node.properties).map(([key, value]) => (
                <div key={key} className="property-item">
                  <span className="property-key">{key}:</span>
                  <span className="property-value">{formatPropertyValue(value)}</span>
                </div>
              ))
            ) : (
              <div className="no-data">No properties</div>
            )}
          </div>
        </div>

        {/* Relationship Summary */}
        <div className="detail-section">
          <h4>Relationships</h4>
          <div className="relationships-summary">
            {Object.keys(relationshipSummary).length > 0 ? (
              Object.entries(relationshipSummary).map(([type, counts]) => (
                <div key={type} className="relationship-item">
                  <span className="relationship-type">{type}</span>
                  <div className="relationship-counts">
                    {counts.outgoing > 0 && (
                      <span className="count outgoing">
                        → {counts.outgoing}
                      </span>
                    )}
                    {counts.incoming > 0 && (
                      <span className="count incoming">
                        ← {counts.incoming}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-data">No relationships</div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="detail-actions">
          <button 
            className="action-button expand-button"
            onClick={() => {
              // Trigger node expansion - will be handled by parent component
              console.log('Expand node:', node.id);
            }}
            title="Expand to show connected nodes"
          >
            Expand
          </button>
          <button 
            className="action-button hide-button"
            onClick={() => {
              // Hide node - will be handled by parent component
              console.log('Hide node:', node.id);
            }}
            title="Hide this node from the graph"
          >
            Hide
          </button>
        </div>
      </div>
    </div>
  );
};

export default NodeDetailPanel;
