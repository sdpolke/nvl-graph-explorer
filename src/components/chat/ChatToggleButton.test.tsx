import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatToggleButton } from './ChatToggleButton';

describe('ChatToggleButton', () => {
  it('renders button with chat icon', () => {
    const onClick = vi.fn();
    render(<ChatToggleButton onClick={onClick} />);
    
    const button = screen.getByRole('button', { name: /open chat assistant/i });
    expect(button).toBeDefined();
    expect(button.querySelector('svg')).toBeDefined();
  });

  it('shows unread badge when hasUnread is true', () => {
    const onClick = vi.fn();
    const { container } = render(<ChatToggleButton onClick={onClick} hasUnread={true} />);
    
    const badge = container.querySelector('.chat-toggle-button__badge');
    expect(badge).toBeDefined();
  });

  it('does not show unread badge when hasUnread is false', () => {
    const onClick = vi.fn();
    const { container } = render(<ChatToggleButton onClick={onClick} hasUnread={false} />);
    
    const badge = container.querySelector('.chat-toggle-button__badge');
    expect(badge).toBeNull();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<ChatToggleButton onClick={onClick} />);
    
    const button = screen.getByRole('button');
    button.click();
    
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
