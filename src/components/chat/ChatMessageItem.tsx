import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage, EntityType, GraphData } from './types';
import { ChatSources } from './ChatSources';
import { parseEntityMentions } from '../../utils/entityMentionParser';
import './ChatMessageItem.css';

interface ChatMessageItemProps {
  message: ChatMessage;
  onEntityClick: (entityId: string, entityType: EntityType) => void;
  onShowInGraph: (graphData: GraphData) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  onEntityClick,
  onShowInGraph
}) => {
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleLinkClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A') {
      e.preventDefault();
      const href = target.getAttribute('href');
      if (href?.startsWith('#entity-')) {
        const entityId = href.replace('#entity-', '');
        const entity = message.entities?.find(e => e.nodeId === entityId);
        if (entity) {
          onEntityClick(entity.nodeId, entity.type);
        }
      }
    }
  };

  const parsedContent = parseEntityMentions(message.content, message.entities);

  return (
    <div className={`chat-message-item chat-message-item--${message.role}`}>
      <div className="chat-message-item__header">
        <span className="chat-message-item__role">
          {message.role === 'user' ? 'You' : 'Assistant'}
        </span>
        <span className="chat-message-item__time">
          {formatTime(message.timestamp)}
        </span>
      </div>
      <div 
        className="chat-message-item__content"
        onClick={handleLinkClick}
      >
        <ReactMarkdown>{parsedContent}</ReactMarkdown>
      </div>
      {message.sources && message.sources.length > 0 && (
        <ChatSources 
          sources={message.sources}
          onEntityClick={onEntityClick}
        />
      )}
      {message.graphData && (
        <div className="chat-message-item__graph-action">
          <button
            className="chat-message-item__graph-button"
            onClick={() => onShowInGraph(message.graphData!)}
          >
            📊 Show in Graph
          </button>
        </div>
      )}
    </div>
  );
};
