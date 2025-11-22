# Implementation Plan: Query Suggestions Feature

- [x] 1. Create type definitions and data structures
  - Add QuerySuggestion, QuerySuggestionCategory, and related types to src/types/index.ts
  - Define props interfaces for new components
  - _Requirements: 3.4, 3.5_

- [x] 2. Implement useQuerySuggestions hook
  - Create src/hooks/useQuerySuggestions.ts
  - Implement JSON loading from src/data/querySuggestions.json
  - Add error handling for malformed JSON
  - Add loading states
  - Implement caching mechanism
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 2.1 Write property test for useQuerySuggestions hook
  - **Property 12: Complexity metadata presence**
  - **Validates: Requirements 7.5**

- [x] 3. Create QuerySuggestionItem component
  - Create src/components/QuerySuggestionItem.tsx
  - Implement click handler
  - Add active state styling
  - Add executing state styling
  - Add disabled state during execution
  - _Requirements: 2.1, 2.2, 2.5, 5.1, 5.3_

- [x] 3.1 Create QuerySuggestionItem styles
  - Create src/components/QuerySuggestionItem.css
  - Style normal, hover, active, and disabled states
  - Add loading indicator styles
  - Ensure accessibility (focus states, contrast)
  - _Requirements: 2.2, 5.1, 5.3_

- [x] 3.2 Write property tests for QuerySuggestionItem
  - **Property 1: Suggestion rendering completeness**
  - **Property 2: Query execution with correct parameters**
  - **Property 3: Visual feedback during execution**
  - **Property 4: Disabled state during execution**
  - **Property 9: Active suggestion highlighting**
  - **Validates: Requirements 1.3, 2.1, 2.2, 2.5, 3.4, 5.1, 5.3**

- [x] 4. Create QuerySuggestionsPanel component
  - Create src/components/QuerySuggestionsPanel.tsx
  - Use useQuerySuggestions hook to load data
  - Render categories with headers
  - Render suggestions using QuerySuggestionItem
  - Implement category ordering
  - Filter out empty categories
  - Handle loading and error states
  - Track active query
  - _Requirements: 1.2, 1.3, 1.4, 4.1, 4.2, 4.3, 4.4, 5.1_

- [x] 4.1 Create QuerySuggestionsPanel styles
  - Create src/components/QuerySuggestionsPanel.css
  - Style category headers
  - Style suggestion list
  - Add empty state styling
  - Add loading state styling
  - Ensure responsive design
  - _Requirements: 1.2, 1.4_

- [x] 4.2 Write property tests for QuerySuggestionsPanel
  - **Property 5: Category grouping**
  - **Property 6: Category header rendering**
  - **Property 7: Category ordering**
  - **Property 8: Empty category filtering**
  - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

- [x] 5. Add tab navigation to TaxonomySidebar
  - Modify src/components/TaxonomySidebar.tsx
  - Add tab state (nodeTypes | queries)
  - Add tab buttons in header
  - Conditionally render content based on active tab
  - Pass onQuerySelect prop to QuerySuggestionsPanel
  - Preserve collapsed state across tab switches
  - _Requirements: 1.1, 1.2, 8.1, 8.5_

- [x] 5.1 Update TaxonomySidebar styles for tabs
  - Modify src/components/TaxonomySidebar.css
  - Add tab button styles
  - Add active tab indicator
  - Ensure smooth transitions
  - Maintain existing responsive behavior
  - _Requirements: 1.1, 8.5_

- [x] 5.2 Write property tests for tab navigation
  - **Property 14: Active tab styling**
  - **Validates: Requirements 8.5**

- [x] 6. Integrate QuerySuggestionsPanel into App.tsx
  - Modify src/App.tsx
  - Pass handleSearch function to TaxonomySidebar
  - Pass isLoading state to TaxonomySidebar
  - Track active query in state
  - Clear active query on manual search input
  - _Requirements: 2.1, 5.2, 5.4_

- [x] 6.1 Write integration tests
  - Test clicking suggestion triggers search
  - Test active suggestion highlighting
  - Test query execution disables suggestions
  - Test manual input clears active suggestion
  - _Requirements: 2.1, 5.2, 5.4_

- [x] 7. Add accessibility features
  - Add keyboard navigation (Tab, Enter, Arrow keys)
  - Add ARIA labels and roles
  - Add screen reader announcements
  - Ensure focus management
  - Test with keyboard-only navigation
  - _Requirements: All (accessibility is cross-cutting)_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Add optional collapsible categories (enhancement)
  - Add collapse/expand functionality to category headers
  - Store collapsed state in local component state
  - Add expand/collapse icons
  - Add smooth animations
  - _Requirements: 4.5_

- [x] 9.1 Write tests for collapsible categories
  - Test collapse/expand functionality
  - Test state persistence within session
  - _Requirements: 4.5_

- [x] 10. Add scroll position preservation (enhancement)
  - Implement scroll position tracking per tab
  - Restore scroll position on tab switch
  - Use refs or state to track positions
  - _Requirements: 8.3_

- [x] 10.1 Write property test for scroll preservation
  - **Property 13: Scroll position preservation**
  - **Validates: Requirements 8.3**

- [ ] 11. Final testing and polish
  - Test with empty JSON file
  - Test with malformed JSON
  - Test with very long query text
  - Test responsive behavior on mobile
  - Test with keyboard navigation
  - Test with screen readers
  - Verify all error states display correctly
  - _Requirements: All_

- [ ] 12. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
