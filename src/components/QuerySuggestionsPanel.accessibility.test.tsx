import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuerySuggestionsPanel } from './QuerySuggestionsPanel';

// Mock the useQuerySuggestions hook
vi.mock('../hooks/useQuerySuggestions', () => ({
  useQuerySuggestions: () => ({
    suggestions: [
      {
        id: 'cat1',
        name: 'Category 1',
        order: 1,
        suggestions: [
          { id: 's1', query: 'Query 1', complexity: 'basic' as const },
          { id: 's2', query: 'Query 2', complexity: 'basic' as const },
          { id: 's3', query: 'Query 3', complexity: 'basic' as const },
        ],
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

describe('QuerySuggestionsPanel Accessibility', () => {
  it('has proper ARIA roles and labels', () => {
    const onQuerySelect = vi.fn();
    const { container } = render(
      <QuerySuggestionsPanel
        onQuerySelect={onQuerySelect}
        isExecuting={false}
        activeQuery={null}
      />
    );

    // Check navigation role
    const nav = container.querySelector('nav');
    expect(nav).toBeTruthy();
    expect(nav?.getAttribute('role')).toBe('navigation');
    expect(nav?.getAttribute('aria-label')).toBe('Query suggestions');

    // Check section roles
    const section = container.querySelector('section');
    expect(section).toBeTruthy();
    expect(section?.getAttribute('aria-labelledby')).toContain('category-');

    // Check list roles
    const list = container.querySelector('[role="list"]');
    expect(list).toBeTruthy();
    expect(list?.getAttribute('aria-label')).toContain('suggestions');

    // Check list items
    const listItems = container.querySelectorAll('[role="listitem"]');
    expect(listItems.length).toBe(3);
  });

  it('supports keyboard navigation with arrow keys', () => {
    const onQuerySelect = vi.fn();
    const { container } = render(
      <QuerySuggestionsPanel
        onQuerySelect={onQuerySelect}
        isExecuting={false}
        activeQuery={null}
      />
    );

    const nav = container.querySelector('nav');
    expect(nav).toBeTruthy();

    // Simulate ArrowDown key
    fireEvent.keyDown(nav!, { key: 'ArrowDown' });
    
    // First item should be focused
    const firstItem = container.querySelectorAll('[role="listitem"]')[0];
    expect(document.activeElement).toBe(firstItem);

    // Simulate ArrowDown again
    fireEvent.keyDown(nav!, { key: 'ArrowDown' });
    
    // Second item should be focused
    const secondItem = container.querySelectorAll('[role="listitem"]')[1];
    expect(document.activeElement).toBe(secondItem);
  });

  it('supports Home and End keys', () => {
    const onQuerySelect = vi.fn();
    const { container } = render(
      <QuerySuggestionsPanel
        onQuerySelect={onQuerySelect}
        isExecuting={false}
        activeQuery={null}
      />
    );

    const nav = container.querySelector('nav');
    expect(nav).toBeTruthy();

    // Press End key
    fireEvent.keyDown(nav!, { key: 'End' });
    
    // Last item should be focused
    const items = container.querySelectorAll('[role="listitem"]');
    const lastItem = items[items.length - 1];
    expect(document.activeElement).toBe(lastItem);

    // Press Home key
    fireEvent.keyDown(nav!, { key: 'Home' });
    
    // First item should be focused
    const firstItem = items[0];
    expect(document.activeElement).toBe(firstItem);
  });

  it('announces state changes to screen readers', () => {
    const onQuerySelect = vi.fn();
    const { container, rerender } = render(
      <QuerySuggestionsPanel
        onQuerySelect={onQuerySelect}
        isExecuting={false}
        activeQuery={null}
      />
    );

    // Check for live region
    const liveRegion = container.querySelector('[role="status"][aria-live="polite"]');
    expect(liveRegion).toBeTruthy();

    // Update to executing state
    rerender(
      <QuerySuggestionsPanel
        onQuerySelect={onQuerySelect}
        isExecuting={true}
        activeQuery="Query 1"
      />
    );

    // Live region should announce execution
    expect(liveRegion?.textContent).toContain('Executing query: Query 1');
  });

  it('has screen reader only content', () => {
    const onQuerySelect = vi.fn();
    const { container } = render(
      <QuerySuggestionsPanel
        onQuerySelect={onQuerySelect}
        isExecuting={false}
        activeQuery={null}
      />
    );

    // Check for sr-only class
    const srOnly = container.querySelector('.sr-only');
    expect(srOnly).toBeTruthy();
  });

  it('disables keyboard navigation when executing', () => {
    const onQuerySelect = vi.fn();
    const { container } = render(
      <QuerySuggestionsPanel
        onQuerySelect={onQuerySelect}
        isExecuting={true}
        activeQuery="Query 1"
      />
    );

    const nav = container.querySelector('nav');
    expect(nav).toBeTruthy();

    // Try to navigate with ArrowDown
    fireEvent.keyDown(nav!, { key: 'ArrowDown' });
    
    // Focus should not change
    expect(document.activeElement).not.toBe(container.querySelector('[role="listitem"]'));
  });
});
