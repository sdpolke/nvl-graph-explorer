import React from 'react';
import { Stethoscope, Maximize2, Minimize2, Minus, X } from 'lucide-react';
import type { ChatHeaderProps } from './types';
import './ChatHeader.css';

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  mode,
  onMinimize,
  onClose,
  onToggleMode
}) => {
  return (
    <div className="chat-header">
      <div className="chat-header__title">
        <Stethoscope size={20} className="chat-header__icon" />
        <h3>Biomedical Assistant</h3>
      </div>
      <div className="chat-header__actions">
        {mode !== 'minimized' && (
          <>
            <button
              className="chat-header__button"
              onClick={onToggleMode}
              aria-label={mode === 'docked' ? 'Float window' : 'Dock window'}
              title={mode === 'docked' ? 'Float window' : 'Dock window'}
            >
              {mode === 'docked' ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
            </button>
            <button
              className="chat-header__button"
              onClick={onMinimize}
              aria-label="Minimize"
              title="Minimize"
            >
              <Minus size={16} />
            </button>
            <button
              className="chat-header__button chat-header__button--close"
              onClick={onClose}
              aria-label="Close"
              title="Close"
            >
              <X size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
