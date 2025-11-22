import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuerySuggestionsPanel } from './QuerySuggestionsPanel';
import * as fc from 'fast-check';

// Mock the useQuerySuggestions hook
vi.mock('../hooks/useQuerySuggestions', () => ({
  useQuerySuggestions: vi.fn(),
}));

import { useQuerySuggestions } from '../hooks/useQuerySuggestions';

describe('QuerySuggestionsPanel - Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property-Based Test: Category grouping
   * Feature: query-suggestions, Property 5: Category grouping
   * 
   * For any set of query suggestions with category assignments, the rendered 
   * output should group suggestions under their respective category headers
   * 
   * Validates: Requirements 4.1
   */
  it(
    'property test: groups suggestions by category',
    () => {
      const complexityArb = fc.constantFrom('basic', 'intermediate', 'advanced');

      const suggestionArb = fc.record({
        id: fc.uuid(),
        query: fc.string({ minLength: 1, maxLength: 200 }),
        description: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
        complexity: complexityArb,
        tags: fc.option(fc.array(fc.string()), { nil: undefined }),
      });

      const categoryArb = fc.record({
        id: fc.uuid(),
        name: fc.string({ minLength: 1, maxLength: 50 }),
        description: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
        icon: fc.option(fc.string({ minLength: 1, maxLength: 2 }), { nil: undefined }),
        order: fc.integer({ min: 0, max: 100 }),
        suggestions: fc.array(suggestionArb, { minLength: 1, maxLength: 10 }),
      });

      fc.assert(
        fc.property(
          fc.array(categoryArb, { minLength: 1, maxLength: 5 }),
          (categories) => {
            // Ensure unique IDs by adding index suffix
            const uniqueCategories = categories.map((cat, catIdx) => ({
              ...cat,
              id: `${cat.id}-cat-${catIdx}`,
              suggestions: cat.suggestions.map((sug, sugIdx) => ({
                ...sug,
                id: `${sug.id}-sug-${catIdx}-${sugIdx}`,
              })),
            }));

            const onQuerySelect = vi.fn();

            vi.mocked(useQuerySuggestions).mockReturnValue({
              suggestions: uniqueCategories,
              isLoading: false,
              error: null,
              reload: vi.fn(),
            });

            const { container } = render(
              <QuerySuggestionsPanel
                onQuerySelect={onQuerySelect}
                isExecuting={false}
                activeQuery={null}
              />
            );

            // Property: Each category should have its own container
            const categoryElements = container.querySelectorAll('.query-category');
            expect(categoryElements.length).toBe(categories.length);

            // Property: Each category should contain all its suggestions
            // Sort categories by order to match component behavior
            const sortedCategories = [...uniqueCategories].sort((a, b) => a.order - b.order);
            sortedCategories.forEach((category, idx) => {
              const categoryElement = categoryElements[idx];
              const suggestionElements = categoryElement.querySelectorAll('.query-suggestion-item');
              expect(suggestionElements.length).toBe(category.suggestions.length);
            });

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
   * Property-Based Test: Category header rendering
   * Feature: query-suggestions, Property 6: Category header rendering
   * 
   * For any category that contains at least one suggestion, the rendered 
   * output should include a header displaying the category name
   * 
   * Validates: Requirements 4.2
   */
  it(
    'property test: renders category headers with names',
    () => {
      const complexityArb = fc.constantFrom('basic', 'intermediate', 'advanced');

      const suggestionArb = fc.record({
        id: fc.uuid(),
        query: fc.string({ minLength: 1, maxLength: 200 }),
        description: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
        complexity: complexityArb,
        tags: fc.option(fc.array(fc.string()), { nil: undefined }),
      });

      const categoryArb = fc.record({
        id: fc.uuid(),
        name: fc.string({ minLength: 1, maxLength: 50 }),
        description: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
        icon: fc.option(fc.string({ minLength: 1, maxLength: 2 }), { nil: undefined }),
        order: fc.integer({ min: 0, max: 100 }),
        suggestions: fc.array(suggestionArb, { minLength: 1, maxLength: 10 }),
      });

      fc.assert(
        fc.property(
          fc.array(categoryArb, { minLength: 1, maxLength: 5 }),
          (categories) => {
            const onQuerySelect = vi.fn();

            vi.mocked(useQuerySuggestions).mockReturnValue({
              suggestions: categories,
              isLoading: false,
              error: null,
              reload: vi.fn(),
            });

            const { container } = render(
              <QuerySuggestionsPanel
                onQuerySelect={onQuerySelect}
                isExecuting={false}
                activeQuery={null}
              />
            );

            // Property: Each category must have a header with the category name
            categories.forEach((category) => {
              const categoryNameElements = Array.from(
                container.querySelectorAll('.category-name')
              );
              const matchingHeader = categoryNameElements.find(
                (el) => el.textContent === category.name
              );
              expect(matchingHeader).toBeTruthy();
            });

            // Property: If category has an icon, it should be rendered
            categories.forEach((category) => {
              if (category.icon) {
                const iconElements = Array.from(
                  container.querySelectorAll('.category-icon')
                );
                const matchingIcon = iconElements.find(
                  (el) => el.textContent === category.icon
                );
                expect(matchingIcon).toBeTruthy();
              }
            });

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
   * Property-Based Test: Category ordering
   * Feature: query-suggestions, Property 7: Category ordering
   * 
   * For any set of categories with defined order values, the rendered 
   * categories should appear sorted by their order property in ascending order
   * 
   * Validates: Requirements 4.3
   */
  it(
    'property test: renders categories in ascending order',
    () => {
      const complexityArb = fc.constantFrom('basic', 'intermediate', 'advanced');

      const suggestionArb = fc.record({
        id: fc.uuid(),
        query: fc.string({ minLength: 1, maxLength: 200 }),
        description: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
        complexity: complexityArb,
        tags: fc.option(fc.array(fc.string()), { nil: undefined }),
      });

      const categoryArb = fc.record({
        id: fc.uuid(),
        name: fc.string({ minLength: 1, maxLength: 50 }),
        description: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
        icon: fc.option(fc.string({ minLength: 1, maxLength: 2 }), { nil: undefined }),
        order: fc.integer({ min: 0, max: 100 }),
        suggestions: fc.array(suggestionArb, { minLength: 1, maxLength: 10 }),
      });

      fc.assert(
        fc.property(
          fc.array(categoryArb, { minLength: 2, maxLength: 5 }),
          (categories) => {
            const onQuerySelect = vi.fn();

            vi.mocked(useQuerySuggestions).mockReturnValue({
              suggestions: categories,
              isLoading: false,
              error: null,
              reload: vi.fn(),
            });

            const { container } = render(
              <QuerySuggestionsPanel
                onQuerySelect={onQuerySelect}
                isExecuting={false}
                activeQuery={null}
              />
            );

            // Property: Categories must be rendered in ascending order by order property
            const categoryNameElements = Array.from(
              container.querySelectorAll('.category-name')
            );

            const renderedNames = categoryNameElements.map((el) => el.textContent);
            const expectedOrder = [...categories]
              .sort((a, b) => a.order - b.order)
              .map((cat) => cat.name);

            expect(renderedNames).toEqual(expectedOrder);

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
   * Property-Based Test: Empty category filtering
   * Feature: query-suggestions, Property 8: Empty category filtering
   * 
   * For any category with zero suggestions, that category should not 
   * appear in the rendered output
   * 
   * Validates: Requirements 4.4
   */
  it(
    'property test: filters out empty categories',
    () => {
      const complexityArb = fc.constantFrom('basic', 'intermediate', 'advanced');

      const suggestionArb = fc.record({
        id: fc.uuid(),
        query: fc.string({ minLength: 1, maxLength: 200 }),
        description: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
        complexity: complexityArb,
        tags: fc.option(fc.array(fc.string()), { nil: undefined }),
      });

      const nonEmptyCategoryArb = fc.record({
        id: fc.uuid(),
        name: fc.string({ minLength: 1, maxLength: 50 }),
        description: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
        icon: fc.option(fc.string({ minLength: 1, maxLength: 2 }), { nil: undefined }),
        order: fc.integer({ min: 0, max: 100 }),
        suggestions: fc.array(suggestionArb, { minLength: 1, maxLength: 10 }),
      });

      const emptyCategoryArb = fc.record({
        id: fc.uuid(),
        name: fc.string({ minLength: 1, maxLength: 50 }),
        description: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
        icon: fc.option(fc.string({ minLength: 1, maxLength: 2 }), { nil: undefined }),
        order: fc.integer({ min: 0, max: 100 }),
        suggestions: fc.constant([] as any),
      });

      fc.assert(
        fc.property(
          fc.array(nonEmptyCategoryArb, { minLength: 1, maxLength: 3 }),
          fc.array(emptyCategoryArb, { minLength: 1, maxLength: 3 }),
          (nonEmptyCategories, emptyCategories) => {
            const onQuerySelect = vi.fn();

            // Mix empty and non-empty categories
            const allCategories = [...nonEmptyCategories, ...emptyCategories];

            vi.mocked(useQuerySuggestions).mockReturnValue({
              suggestions: allCategories,
              isLoading: false,
              error: null,
              reload: vi.fn(),
            });

            const { container } = render(
              <QuerySuggestionsPanel
                onQuerySelect={onQuerySelect}
                isExecuting={false}
                activeQuery={null}
              />
            );

            // Property: Only non-empty categories should be rendered
            const categoryElements = container.querySelectorAll('.query-category');
            expect(categoryElements.length).toBe(nonEmptyCategories.length);

            // Property: Empty category names should not appear in the DOM
            emptyCategories.forEach((emptyCategory) => {
              const categoryNameElements = Array.from(
                container.querySelectorAll('.category-name')
              );
              const matchingHeader = categoryNameElements.find(
                (el) => el.textContent === emptyCategory.name
              );
              expect(matchingHeader).toBeFalsy();
            });

            // Property: Non-empty category names should appear in the DOM
            nonEmptyCategories.forEach((nonEmptyCategory) => {
              const categoryNameElements = Array.from(
                container.querySelectorAll('.category-name')
              );
              const matchingHeader = categoryNameElements.find(
                (el) => el.textContent === nonEmptyCategory.name
              );
              expect(matchingHeader).toBeTruthy();
            });

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
   * Unit Test: Collapsible categories functionality
   * 
   * Tests that categories can be collapsed and expanded by clicking the header
   * 
   * Validates: Requirements 4.5
   */
  it('collapses and expands categories when header is clicked', () => {
    const mockCategories = [
      {
        id: 'cat-1',
        name: 'Category 1',
        order: 1,
        suggestions: [
          { id: 'sug-1', query: 'Query 1', complexity: 'basic' as const },
          { id: 'sug-2', query: 'Query 2', complexity: 'basic' as const },
        ],
      },
      {
        id: 'cat-2',
        name: 'Category 2',
        order: 2,
        suggestions: [
          { id: 'sug-3', query: 'Query 3', complexity: 'basic' as const },
        ],
      },
    ];

    const onQuerySelect = vi.fn();

    vi.mocked(useQuerySuggestions).mockReturnValue({
      suggestions: mockCategories,
      isLoading: false,
      error: null,
      reload: vi.fn(),
    });

    const { container } = render(
      <QuerySuggestionsPanel
        onQuerySelect={onQuerySelect}
        isExecuting={false}
        activeQuery={null}
      />
    );

    // Initially, all categories should be expanded
    const categoryHeaders = container.querySelectorAll('.category-header');
    expect(categoryHeaders[0].getAttribute('aria-expanded')).toBe('true');
    expect(categoryHeaders[1].getAttribute('aria-expanded')).toBe('true');

    // Check that suggestions are visible
    const categorySuggestions = container.querySelectorAll('.category-suggestions');
    expect(categorySuggestions[0].classList.contains('collapsed')).toBe(false);
    expect(categorySuggestions[1].classList.contains('collapsed')).toBe(false);

    // Click first category header to collapse it
    fireEvent.click(categoryHeaders[0]);

    // First category should now be collapsed
    expect(categoryHeaders[0].getAttribute('aria-expanded')).toBe('false');
    expect(categorySuggestions[0].classList.contains('collapsed')).toBe(true);
    expect(categorySuggestions[0].getAttribute('aria-hidden')).toBe('true');

    // Second category should still be expanded
    expect(categoryHeaders[1].getAttribute('aria-expanded')).toBe('true');
    expect(categorySuggestions[1].classList.contains('collapsed')).toBe(false);

    // Click first category header again to expand it
    fireEvent.click(categoryHeaders[0]);

    // First category should now be expanded again
    expect(categoryHeaders[0].getAttribute('aria-expanded')).toBe('true');
    expect(categorySuggestions[0].classList.contains('collapsed')).toBe(false);
    expect(categorySuggestions[0].getAttribute('aria-hidden')).toBe('false');

    // Cleanup
    container.remove();
  });

  /**
   * Unit Test: Collapsed state persistence within session
   * 
   * Tests that collapsed state is maintained when component re-renders
   * 
   * Validates: Requirements 4.5
   */
  it('maintains collapsed state across re-renders', () => {
    const mockCategories = [
      {
        id: 'cat-1',
        name: 'Category 1',
        order: 1,
        suggestions: [
          { id: 'sug-1', query: 'Query 1', complexity: 'basic' as const },
        ],
      },
    ];

    const onQuerySelect = vi.fn();

    vi.mocked(useQuerySuggestions).mockReturnValue({
      suggestions: mockCategories,
      isLoading: false,
      error: null,
      reload: vi.fn(),
    });

    const { container, rerender } = render(
      <QuerySuggestionsPanel
        onQuerySelect={onQuerySelect}
        isExecuting={false}
        activeQuery={null}
      />
    );

    // Collapse the category
    const categoryHeader = container.querySelector('.category-header');
    fireEvent.click(categoryHeader!);

    // Verify it's collapsed
    expect(categoryHeader!.getAttribute('aria-expanded')).toBe('false');

    // Re-render with different props
    rerender(
      <QuerySuggestionsPanel
        onQuerySelect={onQuerySelect}
        isExecuting={true}
        activeQuery="Query 1"
      />
    );

    // Collapsed state should be maintained
    expect(categoryHeader!.getAttribute('aria-expanded')).toBe('false');
    const categorySuggestions = container.querySelector('.category-suggestions');
    expect(categorySuggestions!.classList.contains('collapsed')).toBe(true);

    // Cleanup
    container.remove();
  });

  /**
   * Unit Test: Expand/collapse icons
   * 
   * Tests that the correct icon is displayed based on collapsed state
   * 
   * Validates: Requirements 4.5
   */
  it('displays correct expand/collapse icons', () => {
    const mockCategories = [
      {
        id: 'cat-1',
        name: 'Category 1',
        order: 1,
        suggestions: [
          { id: 'sug-1', query: 'Query 1', complexity: 'basic' as const },
        ],
      },
    ];

    const onQuerySelect = vi.fn();

    vi.mocked(useQuerySuggestions).mockReturnValue({
      suggestions: mockCategories,
      isLoading: false,
      error: null,
      reload: vi.fn(),
    });

    const { container } = render(
      <QuerySuggestionsPanel
        onQuerySelect={onQuerySelect}
        isExecuting={false}
        activeQuery={null}
      />
    );

    const expandIcon = container.querySelector('.category-expand-icon');
    const categoryHeader = container.querySelector('.category-header');

    // Initially expanded - should show down arrow
    expect(expandIcon!.textContent).toBe('▼');

    // Click to collapse
    fireEvent.click(categoryHeader!);

    // Should now show right arrow
    expect(expandIcon!.textContent).toBe('▶');

    // Click to expand again
    fireEvent.click(categoryHeader!);

    // Should show down arrow again
    expect(expandIcon!.textContent).toBe('▼');

    // Cleanup
    container.remove();
  });
});
