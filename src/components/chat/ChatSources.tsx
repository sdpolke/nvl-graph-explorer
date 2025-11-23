import React, { useState } from 'react';
import { ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import type { Source, EntityType } from './types';
import './ChatSources.css';

interface ChatSourcesProps {
  sources: Source[];
  onEntityClick: (entityId: string, entityType: EntityType) => void;
}

export const ChatSources: React.FC<ChatSourcesProps> = ({ sources, onEntityClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!sources || sources.length === 0) {
    return null;
  }

  const getEntityTypeColor = (type: EntityType): string => {
    const colors: Record<EntityType, string> = {
      Drug: '#4CAF50',
      Disease: '#F44336',
      ClinicalDisease: '#FF9800',
      Protein: '#2196F3'
    };
    return colors[type] || '#757575';
  };

  const formatRelevanceScore = (score: number): string => {
    return `${Math.round(score * 100)}%`;
  };

  const handleSourceClick = (source: Source) => {
    onEntityClick(source.nodeId, source.entityType);
  };

  return (
    <div className="chat-sources">
      <button
        className="chat-sources__toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className="chat-sources__toggle-icon">
          {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </span>
        <span className="chat-sources__toggle-text">
          {sources.length} {sources.length === 1 ? 'Source' : 'Sources'}
        </span>
      </button>

      {isExpanded && (
        <div className="chat-sources__list">
          {sources.map((source, index) => (
            <div
              key={`${source.nodeId}-${index}`}
              className="chat-sources__item"
              onClick={() => handleSourceClick(source)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSourceClick(source);
                }
              }}
            >
              <div className="chat-sources__item-header">
                <span
                  className="chat-sources__item-type"
                  style={{ backgroundColor: getEntityTypeColor(source.entityType) }}
                >
                  {source.entityType}
                </span>
                <span className="chat-sources__item-name">
                  {source.entityName}
                </span>
                <span className="chat-sources__item-score">
                  {formatRelevanceScore(source.relevanceScore)}
                </span>
              </div>
              {source.excerpt && (
                <div className="chat-sources__item-excerpt">
                  {source.excerpt}
                </div>
              )}
              <div className="chat-sources__item-action">
                <span className="chat-sources__item-link">
                  View in Graph <ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
