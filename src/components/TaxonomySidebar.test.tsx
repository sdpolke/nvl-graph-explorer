import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TaxonomySidebar } from './TaxonomySidebar';
import * as fc from 'fast-check';
import { act } from 'react';

describe('TaxonomySidebar', () => {
  /**
   * Property-Based Test: Scroll position preservation
   * Feature: query-suggestions, Property 13: Scroll position preservation
   * 
   * For any scroll position within a tab, switching to another tab and then 
   * returning should restore the original scroll position
   * 
   * Validates: Requirements 8.3
   */
  it(
    'property test: scroll position is preserved when switching tabs',
    async () => {
      const labelArb = fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 20, maxLength: 30 });
      const nodeCountsArb = fc.dictionary(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.nat({ max: 10000 })
      );
      const scrollPositionArb = fc.nat({ max: 500 });

      await fc.assert(
        fc.asyncProperty(labelArb, nodeCountsArb, scrollPositionArb, async (labels, nodeCounts, scrollPosition) => {
          const onLabelToggle = vi.fn();
          const onQuerySelect = vi.fn();

          const { container } = render(
            <TaxonomySidebar
              labels={labels}
              selectedLabels={[]}
              onLabelToggle={onLabelToggle}
              nodeCounts={nodeCounts}
              onQuerySelect={onQuerySelect}
              isQueryExecuting={false}
            />
          );

          // Find the scrollable container for node types
          const nodeTypesScrollContainer = container.querySelector('.taxonomy-list') as HTMLElement;
          expect(nodeTypesScrollContainer).toBeTruthy();

          // Set a scroll position on the node types tab
          await act(async () => {
            nodeTypesScrollContainer.scrollTop = scrollPosition;
          });

          // Verify scroll position was set
          const initialScrollPosition = nodeTypesScrollContainer.scrollTop;

          // Switch to queries tab
          const tabButtons = container.querySelectorAll('.tab-button');
          const queriesTab = tabButtons[1];
          
          await act(async () => {
            (queriesTab as HTMLElement).click();
          });

          await waitFor(() => {
            expect(queriesTab.classList.contains('active')).toBe(true);
          });

          // Switch back to node types tab
          const nodeTypesTab = tabButtons[0];
          await act(async () => {
            (nodeTypesTab as HTMLElement).click();
          });

          await waitFor(() => {
            expect(nodeTypesTab.classList.contains('active')).toBe(true);
          });

          // Property: Scroll position should be restored
          await waitFor(() => {
            const restoredScrollPosition = nodeTypesScrollContainer.scrollTop;
            expect(restoredScrollPosition).toBe(initialScrollPosition);
          });

          // Cleanup
          container.remove();
        }),
        { numRuns: 100 }
      );
    },
    30000
  );

  /**
   * Property-Based Test: Active tab styling
   * Feature: query-suggestions, Property 14: Active tab styling
   * 
   * For any tab that is currently active, the rendered tab component should 
   * apply distinct visual styling different from inactive tabs
   * 
   * Validates: Requirements 8.5
   */
  it(
    'property test: active tab has distinct styling',
    async () => {
      const labelArb = fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 10 });
      const nodeCountsArb = fc.dictionary(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.nat({ max: 10000 })
      );

      await fc.assert(
        fc.asyncProperty(labelArb, nodeCountsArb, async (labels, nodeCounts) => {
          const onLabelToggle = vi.fn();
          const onQuerySelect = vi.fn();

          const { container } = render(
            <TaxonomySidebar
              labels={labels}
              selectedLabels={[]}
              onLabelToggle={onLabelToggle}
              nodeCounts={nodeCounts}
              onQuerySelect={onQuerySelect}
              isQueryExecuting={false}
            />
          );

          // Find all tab buttons
          const tabButtons = container.querySelectorAll('.tab-button');
          expect(tabButtons.length).toBe(2);

          const nodeTypesTab = tabButtons[0];
          const queriesTab = tabButtons[1];

          // Property: Exactly one tab should have 'active' class initially (nodeTypes by default)
          expect(nodeTypesTab.classList.contains('active')).toBe(true);
          expect(queriesTab.classList.contains('active')).toBe(false);

          // Property: Active tab should have aria-selected="true"
          expect(nodeTypesTab.getAttribute('aria-selected')).toBe('true');
          expect(queriesTab.getAttribute('aria-selected')).toBe('false');

          // Click the queries tab
          await act(async () => {
            (queriesTab as HTMLElement).click();
          });

          // Wait for state update
          await waitFor(() => {
            expect(queriesTab.classList.contains('active')).toBe(true);
          });

          // Property: After clicking, the clicked tab should become active
          expect(queriesTab.classList.contains('active')).toBe(true);
          expect(nodeTypesTab.classList.contains('active')).toBe(false);

          // Property: Active state should be reflected in aria-selected
          expect(queriesTab.getAttribute('aria-selected')).toBe('true');
          expect(nodeTypesTab.getAttribute('aria-selected')).toBe('false');

          // Click back to node types tab
          await act(async () => {
            (nodeTypesTab as HTMLElement).click();
          });

          // Wait for state update
          await waitFor(() => {
            expect(nodeTypesTab.classList.contains('active')).toBe(true);
          });

          // Property: Tab state should toggle back
          expect(nodeTypesTab.classList.contains('active')).toBe(true);
          expect(queriesTab.classList.contains('active')).toBe(false);

          // Cleanup
          container.remove();
        }),
        { numRuns: 100 }
      );
    },
    30000
  );
});
