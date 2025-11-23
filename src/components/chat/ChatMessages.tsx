import React, { useEffect, useRef } from 'react';
import { Stethoscope } from 'lucide-react';
import type { ChatMessagesProps } from './types';
import { ChatMessageItem } from './ChatMessageItem';
import './ChatMessages.css';

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  onEntityClick,
  onShowInGraph
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="chat-messages chat-messages--empty">
        <div className="chat-messages__empty-state">
          <p><Stethoscope size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px', color: '#007bff' }} /> Hello! I'm your biomedical knowledge assistant.</p>
          <p>Ask me about drugs, diseases, proteins, or their relationships.</p>
          <div className="chat-messages__examples">
            <p><strong>Try asking:</strong></p>
            <ul>
              <li>"What drugs treat diabetes?"</li>
              <li>"Find drugs similar to Aspirin"</li>
              <li>"What are the symptoms of Alzheimer's disease?"</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-messages">
      {messages.map((message) => (
        <ChatMessageItem
          key={message.id}
          message={message}
          onEntityClick={onEntityClick}
          onShowInGraph={onShowInGraph}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};
