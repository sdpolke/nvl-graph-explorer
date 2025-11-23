import React from 'react';
import type { Node, Relationship } from '../types';
import './NodeDetailsPanel.css';

interface NodeDetailsPanelProps {
  selectedNode?: Node | null;
  selectedRelationship?: Relationship | null;
  onClose: () => void;
}

export const NodeDetailsPanel: React.FC<NodeDetailsPanelProps> = ({
  selectedNode,
  selectedRelationship,
  onClose,
}) => {
  if (!selectedNode && !selectedRelationship) {
    return null;
  }

  // Filter out embedding properties (they're too large and not useful to display)
  const filterProperties = (properties: Record<string, any>) => {
    return Object.entries(properties).filter(([key]) => 
      !key.toLowerCase().includes('embedding') && 
      !key.toLowerCase().includes('vector')
    );
  };

  return (
    <>
      <div className="node-details-overlay" onClick={onClose} />
      <div className="node-details-panel">
      <div className="details-header">
        <h4 className="details-title">
          {selectedNode ? 'Node Details' : 'Relationship Details'}
        </h4>
        <button 
          className="details-close"
          onClick={onClose}
          aria-label="Close details"
        >
          ×
        </button>
      </div>

      <div className="details-content">
        {selectedNode && (
          <>
            <div className="details-section">
              <span className="details-label">ID:</span>
              <span className="details-value">{selectedNode.id}</span>
            </div>
            <div className="details-section">
              <span className="details-label">Labels:</span>
              <div className="details-labels">
                {selectedNode.labels.map(label => (
                  <span key={label} className="label-badge">{label}</span>
                ))}
              </div>
            </div>
            <div className="details-section properties-section">
              <span className="details-label">Properties:</span>
              <div className="details-properties-grid">
                {filterProperties(selectedNode.properties).map(([key, value]) => (
                  <div key={key} className="property-row">
                    <span className="property-key">{key}:</span>
                    <span className="property-value">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {selectedRelationship && (
          <>
            <div className="details-section">
              <span className="details-label">ID:</span>
              <span className="details-value">{selectedRelationship.id}</span>
            </div>
            <div className="details-section">
              <span className="details-label">Type:</span>
              <span className="relationship-type">{selectedRelationship.type}</span>
            </div>
            <div className="details-section">
              <span className="details-label">Direction:</span>
              <span className="details-value">
                {selectedRelationship.startNodeId} → {selectedRelationship.endNodeId}
              </span>
            </div>
            {Object.keys(selectedRelationship.properties).length > 0 && (
              <div className="details-section properties-section">
                <span className="details-label">Properties:</span>
                <div className="details-properties-grid">
                  {filterProperties(selectedRelationship.properties).map(([key, value]) => (
                    <div key={key} className="property-row">
                      <span className="property-key">{key}:</span>
                      <span className="property-value">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      </div>
    </>
  );
};
