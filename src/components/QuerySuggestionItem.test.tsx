import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QuerySuggestionItem } from './QuerySuggestionItem';
import * as fc from 'fast-check';
import type { QuerySuggestion } from '../types';

describe('QuerySuggestionItem', () => {
  /**
   * Property-Based Test: Suggestion rendering completeness
   * Feature: query-suggestions, Property 1: Suggestion rendering completeness
   * 
   * For any query suggestion loaded from the configuration, the rendered component 
   * should display the query text, category name, and description (if present)
   * 
   * Validates: Requirements 1.3, 3.4
   */
  it(
    'property test: renders all suggestion content',
    () => {
      const complexityArb = fc.constantFrom('basic', 'intermediate', 'advanced');

      const suggestionArb = fc.record({
        id: fc.string({ minLength: 1 }),
        query: fc.string({ minLength: 1, maxLength: 200 }),
        description: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
        complexity: complexityArb,
        tags: fc.option(fc.array(fc.string()), { nil: undefined }),
      });

      fc.assert(
        fc.property(
          suggestionArb,
          fc.boolean(),
          fc.boolean(),
          (suggestion, isActive, isExecuting) => {
            const onClick = vi.fn();

            const { container } = render(
              <QuerySuggestionItem
                suggestion={suggestion}
                isActive={isActive}
                isExecuting={isExecuting}
                onClick={onClick}
              />
            );

            // Property: Query text must be rendered in the DOM
            const queryElement = container.querySelector('.suggestion-query');
            expect(queryElement).toBeTruthy();
            expect(queryElement?.textContent).toBe(suggestion.query);

            // Property: Description must be rendered if present
            if (suggestion.description) {
              const descElement = container.querySelector('.suggestion-description');
              expect(descElement).toBeTruthy();
              expect(descElement?.textContent).toBe(suggestion.description);
            }

            // Property: Complexity badge must be rendered
            const complexityElement = container.querySelector('.complexity-badge');
            expect(complexityElement).toBeTruthy();
            expect(complexityElement?.textContent).toBe(suggestion.complexity);

            // Cleanup
            container.remove();
          }
        ),
        { numRuns: 100 }
      );
    },
    30000
  );

  /**
   * Property-Based Test: Query execution with correct parameters
   * Feature: query-suggestions, Property 2: Query execution with correct parameters
   * 
   * For any query suggestion, when clicked, the system should call the search handler 
   * with the suggestion's query text and type 'natural'
   * 
   * Validates: Requirements 2.1
   */
  it(
    'property test: clicking suggestion calls onClick handler',
    () => {
      const complexityArb = fc.constantFrom('basic', 'intermediate', 'advanced');

      const suggestionArb = fc.record({
        id: fc.string({ minLength: 1 }),
        query: fc.string({ minLength: 1, maxLength: 200 }),
        description: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
        complexity: complexityArb,
        tags: fc.option(fc.array(fc.string()), { nil: undefined }),
      });

      fc.assert(
        fc.property(suggestionArb, (suggestion) => {
          const onClick = vi.fn();

          const { container } = render(
            <QuerySuggestionItem
              suggestion={suggestion}
              isActive={false}
              isExecuting={false}
              onClick={onClick}
            />
          );

          const element = container.querySelector('.query-suggestion-item');
          expect(element).toBeTruthy();

          // Property: Clicking should call onClick handler
          element?.click();
          expect(onClick).toHaveBeenCalledTimes(1);

          // Cleanup
          container.remove();
        }),
        { numRuns: 100 }
      );
    },
    30000
  );

  /**
   * Property-Based Test: Visual feedback during execution
   * Feature: query-suggestions, Property 3: Visual feedback during execution
   * 
   * For any query suggestion that is currently executing, the system should 
   * display a loading indicator or disabled state
   * 
   * Validates: Requirements 2.2
   */
  it(
    'property test: shows loading indicator when executing and active',
    () => {
      const complexityArb = fc.constantFrom('basic', 'intermediate', 'advanced');

      const suggestionArb = fc.record({
        id: fc.string({ minLength: 1 }),
        query: fc.string({ minLength: 1, maxLength: 200 }),
        description: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
        complexity: complexityArb,
        tags: fc.option(fc.array(fc.string()), { nil: undefined }),
      });

      fc.assert(
        fc.property(suggestionArb, fc.boolean(), (suggestion, isActive) => {
          const onClick = vi.fn();

          const { container } = render(
            <QuerySuggestionItem
              suggestion={suggestion}
              isActive={isActive}
              isExecuting={true}
              onClick={onClick}
            />
          );

          // Property: When executing and active, loading indicator must be present
          if (isActive) {
            const loadingIndicator = container.querySelector('.loading-indicator');
            expect(loadingIndicator).toBeTruthy();
            expect(loadingIndicator?.getAttribute('role')).toBe('status');
          }

          // Property: When executing, element must have executing class
          const element = container.querySelector('.query-suggestion-item');
          expect(element?.classList.contains('executing')).toBe(true);

          // Cleanup
          container.remove();
        }),
        { numRuns: 100 }
      );
    },
    30000
  );

  /**
   * Property-Based Test: Disabled state during execution
   * Feature: query-suggestions, Property 4: Disabled state during execution
   * 
   * For any query suggestion, when any query is executing, clicking that 
   * suggestion should be prevented (disabled state)
   * 
   * Validates: Requirements 2.5
   */
  it(
    'property test: prevents clicks when executing',
    () => {
      const complexityArb = fc.constantFrom('basic', 'intermediate', 'advanced');

      const suggestionArb = fc.record({
        id: fc.string({ minLength: 1 }),
        query: fc.string({ minLength: 1, maxLength: 200 }),
        description: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
        complexity: complexityArb,
        tags: fc.option(fc.array(fc.string()), { nil: undefined }),
      });

      fc.assert(
        fc.property(suggestionArb, fc.boolean(), (suggestion, isActive) => {
          const onClick = vi.fn();

          const { container } = render(
            <QuerySuggestionItem
              suggestion={suggestion}
              isActive={isActive}
              isExecuting={true}
              onClick={onClick}
            />
          );

          const element = container.querySelector('.query-suggestion-item');
          expect(element).toBeTruthy();

          // Property: When executing, clicking should NOT call onClick
          element?.click();
          expect(onClick).not.toHaveBeenCalled();

          // Property: Element should have disabled class
          expect(element?.classList.contains('disabled')).toBe(true);

          // Property: Element should have aria-disabled attribute
          expect(element?.getAttribute('aria-disabled')).toBe('true');

          // Property: Element should have tabIndex -1 (not keyboard focusable)
          expect(element?.getAttribute('tabIndex')).toBe('-1');

          // Cleanup
          container.remove();
        }),
        { numRuns: 100 }
      );
    },
    30000
  );

  /**
   * Property-Based Test: Active suggestion highlighting
   * Feature: query-suggestions, Property 9: Active suggestion highlighting
   * 
   * For any query suggestion that is marked as active, the rendered component 
   * should apply distinct visual styling (e.g., background color, border) 
   * different from inactive suggestions
   * 
   * Validates: Requirements 5.1, 5.3
   */
  it(
    'property test: applies active styling when active',
    () => {
      const complexityArb = fc.constantFrom('basic', 'intermediate', 'advanced');

      const suggestionArb = fc.record({
        id: fc.string({ minLength: 1 }),
        query: fc.string({ minLength: 1, maxLength: 200 }),
        description: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
        complexity: complexityArb,
        tags: fc.option(fc.array(fc.string()), { nil: undefined }),
      });

      fc.assert(
        fc.property(suggestionArb, fc.boolean(), (suggestion, isExecuting) => {
          const onClick = vi.fn();

          // Render with isActive=true
          const { container: activeContainer } = render(
            <QuerySuggestionItem
              suggestion={suggestion}
              isActive={true}
              isExecuting={isExecuting}
              onClick={onClick}
            />
          );

          const activeElement = activeContainer.querySelector('.query-suggestion-item');
          expect(activeElement).toBeTruthy();

          // Property: Active element must have 'active' class
          expect(activeElement?.classList.contains('active')).toBe(true);

          // Property: Active element must have aria-current="true"
          expect(activeElement?.getAttribute('aria-current')).toBe('true');

          // Render with isActive=false
          const { container: inactiveContainer } = render(
            <QuerySuggestionItem
              suggestion={suggestion}
              isActive={false}
              isExecuting={isExecuting}
              onClick={onClick}
            />
          );

          const inactiveElement = inactiveContainer.querySelector('.query-suggestion-item');
          expect(inactiveElement).toBeTruthy();

          // Property: Inactive element must NOT have 'active' class
          expect(inactiveElement?.classList.contains('active')).toBe(false);

          // Property: Inactive element must NOT have aria-current attribute
          expect(inactiveElement?.getAttribute('aria-current')).toBeNull();

          // Cleanup
          activeContainer.remove();
          inactiveContainer.remove();
        }),
        { numRuns: 100 }
      );
    },
    30000
  );
});
