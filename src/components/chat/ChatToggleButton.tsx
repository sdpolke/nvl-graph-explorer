import React from 'react';
import { Stethoscope } from 'lucide-react';
import './ChatToggleButton.css';

export interface ChatToggleButtonProps {
  onClick: () => void;
  hasUnread?: boolean;
}

export const ChatToggleButton: React.FC<ChatToggleButtonProps> = ({
  onClick,
  hasUnread = false
}) => {
  return (
    <button
      className="chat-toggle-button"
      onClick={onClick}
      aria-label="Open chat assistant"
      title="Open chat assistant"
    >
      <Stethoscope size={28} className="chat-toggle-button__icon" />
      {hasUnread && (
        <span 
          className="chat-toggle-button__badge"
          aria-label="Unread messages"
        />
      )}
    </button>
  );
};
