import React, { type KeyboardEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';
import type { ChatInputProps } from './types';
import './ChatInput.css';

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSubmit,
  isLoading
}) => {
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading) {
        onSubmit();
      }
    }
  };

  return (
    <div className="chat-input">
      <textarea
        className="chat-input__field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about drugs, diseases, or proteins..."
        disabled={isLoading}
        rows={2}
        aria-label="Chat message input"
      />
      <button
        className="chat-input__button"
        onClick={onSubmit}
        disabled={!value.trim() || isLoading}
        aria-label="Send message"
      >
        {isLoading ? (
          <Loader2 size={20} className="chat-input__spinner" />
        ) : (
          <Send size={20} />
        )}
      </button>
    </div>
  );
};
