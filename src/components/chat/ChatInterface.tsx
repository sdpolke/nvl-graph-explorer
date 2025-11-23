import React, { useState, useRef, useEffect } from 'react';
import { Stethoscope, X } from 'lucide-react';
import type { ChatInterfaceProps, ChatMode, ChatMessage, ChatPosition, ChatSize } from './types';
import { ChatHeader } from './ChatHeader';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { chatService, ChatServiceError } from '../../services/ChatService';
import './ChatInterface.css';

const MIN_WIDTH = 300;
const MIN_HEIGHT = 400;
const DEFAULT_DOCKED_WIDTH = 400;

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  isOpen,
  mode: externalMode,
  onClose,
  onModeChange,
  onEntityClick,
  onShowInGraph
}) => {
  const [mode, setMode] = useState<ChatMode>(externalMode || 'docked');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  const [position, setPosition] = useState<ChatPosition>({ x: 100, y: 100 });
  const [size, setSize] = useState<ChatSize>({ 
    width: DEFAULT_DOCKED_WIDTH, 
    height: 600 
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ width: 0, height: 0, mouseX: 0, mouseY: 0 });

  useEffect(() => {
    if (externalMode) {
      setMode(externalMode);
    }
  }, [externalMode]);

  useEffect(() => {
    if (!isOpen) {
      setMode('minimized');
    } else if (mode === 'minimized') {
      setMode('docked');
    }
  }, [isOpen, mode]);

  const handleMinimize = () => {
    const newMode = 'minimized';
    setMode(newMode);
    onModeChange?.(newMode);
    onClose();
  };

  const handleToggleMode = () => {
    const newMode = mode === 'docked' ? 'floating' : 'docked';
    setMode(newMode);
    onModeChange?.(newMode);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (mode !== 'floating') return;
    
    const target = e.target as HTMLElement;
    if (target.closest('.chat-header') && !target.closest('button')) {
      isDraggingRef.current = true;
      dragStartRef.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y
      };
      e.preventDefault();
    }
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (mode !== 'floating') return;
    
    isResizingRef.current = true;
    resizeStartRef.current = {
      width: size.width,
      height: size.height,
      mouseX: e.clientX,
      mouseY: e.clientY
    };
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        const newX = e.clientX - dragStartRef.current.x;
        const newY = e.clientY - dragStartRef.current.y;
        
        // Constrain to viewport
        const maxX = window.innerWidth - size.width;
        const maxY = window.innerHeight - size.height;
        
        setPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY))
        });
      }
      
      if (isResizingRef.current) {
        const deltaX = e.clientX - resizeStartRef.current.mouseX;
        const deltaY = e.clientY - resizeStartRef.current.mouseY;
        
        const newWidth = Math.max(MIN_WIDTH, resizeStartRef.current.width + deltaX);
        const newHeight = Math.max(MIN_HEIGHT, resizeStartRef.current.height + deltaY);
        
        setSize({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      isResizingRef.current = false;
    };

    if (mode === 'floating') {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [mode, size.width, size.height]);

  const handleSubmit = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError('');

    try {
      // Call backend API
      const response = await chatService.sendMessage({
        message: inputValue,
        conversationId: conversationId || undefined,
        includeGraph: true
      });

      // Store conversation ID for follow-up messages
      if (!conversationId) {
        setConversationId(response.conversationId);
      }

      // Create assistant message from response
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.answer,
        timestamp: new Date(),
        sources: response.sources,
        graphData: response.graphData
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Error sending message:', err);
      
      // Display error message to user
      let errorMessage = 'Failed to send message. Please try again.';
      
      if (err instanceof ChatServiceError) {
        if (err.statusCode === 503) {
          errorMessage = 'Service temporarily unavailable. Please try again in a moment.';
        } else if (err.statusCode === 429) {
          errorMessage = 'Too many requests. Please wait a moment and try again.';
        } else if (err.statusCode === 408) {
          errorMessage = 'Request timeout. Please check your connection and try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      
      // Add error message to chat
      const errorChatMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `⚠️ ${errorMessage}`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorChatMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === 'minimized') {
    return (
      <button
        className="chat-interface chat-interface--minimized"
        onClick={() => setMode('docked')}
        aria-label="Open chat"
      >
        <Stethoscope size={28} />
      </button>
    );
  }

  const style = mode === 'floating' ? {
    left: `${position.x}px`,
    top: `${position.y}px`,
    width: `${size.width}px`,
    height: `${size.height}px`
  } : undefined;

  return (
    <div
      ref={containerRef}
      className={`chat-interface chat-interface--${mode}`}
      style={style}
      onMouseDown={handleMouseDown}
    >
      <ChatHeader
        mode={mode}
        onMinimize={handleMinimize}
        onClose={onClose}
        onToggleMode={handleToggleMode}
      />
      {error && (
        <div className="chat-interface__error" role="alert">
          {error}
          <button
            className="chat-interface__error-close"
            onClick={() => setError('')}
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        </div>
      )}
      <ChatMessages
        messages={messages}
        onEntityClick={onEntityClick}
        onShowInGraph={onShowInGraph}
      />
      <ChatInput
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
      {mode === 'floating' && (
        <div
          className="chat-interface__resize-handle"
          onMouseDown={handleResizeMouseDown}
          aria-label="Resize chat window"
        />
      )}
    </div>
  );
};
