# Design Document: Query Suggestions Feature

## Overview

The Query Suggestions feature enhances the graph exploration experience by providing users with a curated set of natural language query examples organized by category. This feature integrates seamlessly with the existing sidebar, adding a new "Suggested Queries" tab alongside "Node Types". Users can click any suggestion to execute it through the existing OpenAI-to-Cypher pipeline, making complex graph queries accessible without requiring Cypher knowledge.

The design emphasizes simplicity, extensibility, and maintainability by storing suggestions in a JSON configuration file that can be easily updated without code changes.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     App.tsx                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │            TaxonomySidebar                        │  │
│  │  ┌─────────────────────────────────────────────┐ │  │
│  │  │  Tab Navigation (Node Types | Queries)      │ │  │
│  │  └─────────────────────────────────────────────┘ │  │
│  │  ┌─────────────────────────────────────────────┐ │  │
│  │  │  QuerySuggestionsPanel                      │ │  │
│  │  │  - Loads from querySuggestions.json        │ │  │
│  │  │  - Renders categories & suggestions        │ │  │
│  │  │  - Handles click → calls onSearch()        │ │  │
│  │  └─────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ↓
              ┌───────────────────────┐
              │  OpenAI Service       │
              │  (existing pipeline)  │
              └───────────────────────┘
```

### Component Structure

```
src/
├── components/
│   ├── TaxonomySidebar.tsx          # Modified: Add tab switching
│   ├── TaxonomySidebar.css          # Modified: Add tab styles
│   ├── QuerySuggestionsPanel.tsx    # New: Main suggestions component
│   ├── QuerySuggestionsPanel.css    # New: Suggestions styling
│   ├── QuerySuggestionItem.tsx      # New: Individual suggestion
│   └── QuerySuggestionItem.css      # New: Item styling
├── data/
│   └── querySuggestions.json        # New: Suggestions configuration
├── hooks/
│   └── useQuerySuggestions.ts       # New: Load & manage suggestions
└── types/
    └── index.ts                      # Modified: Add suggestion types
```

## Components and Interfaces

### 1. Modified TaxonomySidebar Component

The existing `TaxonomySidebar` will be enhanced to support tab navigation between "Node Types" and "Suggested Queries".

**Key Changes:**
- Add tab state management
- Render different content based on active tab
- Preserve collapsed state across tab switches
- Pass search handler to QuerySuggestionsPanel

**Props Interface:**
```typescript
interface TaxonomySidebarProps {
  // Existing props
  labels: string[];
  selectedLabels: string[];
  onLabelToggle: (label: string) => void;
  nodeCounts: Record<string, number>;
  
  // New props
  onQuerySelect: (query: string) => void;
  isQueryExecuting: boolean;
}
```

### 2. QuerySuggestionsPanel Component

New component that displays categorized query suggestions.

**Responsibilities:**
- Load suggestions using `useQuerySuggestions` hook
- Render categories with collapsible sections
- Handle suggestion clicks
- Show loading/error states
- Track active suggestion

**Props Interface:**
```typescript
interface QuerySuggestionsPanelProps {
  onQuerySelect: (query: string) => void;
  isExecuting: boolean;
  activeQuery: string | null;
}
```

### 3. QuerySuggestionItem Component

Reusable component for individual query suggestions.

**Responsibilities:**
- Display query text and description
- Handle click events
- Show active/hover states
- Display loading indicator when executing

**Props Interface:**
```typescript
interface QuerySuggestionItemProps {
  suggestion: QuerySuggestion;
  isActive: boolean;
  isExecuting: boolean;
  onClick: () => void;
}
```

### 4. useQuerySuggestions Hook

Custom hook for loading and managing query suggestions.

**Responsibilities:**
- Load suggestions from JSON file
- Handle loading states
- Handle errors gracefully
- Provide fallback suggestions
- Cache loaded suggestions

**Return Interface:**
```typescript
interface UseQuerySuggestionsReturn {
  suggestions: QuerySuggestionCategory[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}
```

## Data Models

### QuerySuggestion

```typescript
interface QuerySuggestion {
  id: string;                    // Unique identifier
  query: string;                 // Natural language query text
  description?: string;          // Optional description/tooltip
  complexity: 'basic' | 'intermediate' | 'advanced';
  tags?: string[];              // Optional tags for filtering
}
```

### QuerySuggestionCategory

```typescript
interface QuerySuggestionCategory {
  id: string;                    // Unique category identifier
  name: string;                  // Display name
  description?: string;          // Optional category description
  icon?: string;                // Optional icon/emoji
  order: number;                // Display order
  suggestions: QuerySuggestion[];
}
```

### JSON Configuration Structure

The actual configuration file is located at `src/data/querySuggestions.json` and contains 11 categories with 60+ curated suggestions based on the real database schema.

**Structure:**
```json
{
  "version": "1.0",
  "description": "Curated natural language query suggestions",
  "categories": [
    {
      "id": "basic-exploration",
      "name": "Basic Exploration",
      "description": "Simple queries to get started",
      "icon": "🔍",
      "order": 1,
      "suggestions": [
        {
          "id": "show-proteins",
          "query": "Show me 20 proteins",
          "description": "Display a sample of protein nodes",
          "complexity": "basic",
          "tags": ["protein", "basic"]
        }
      ]
    }
  ]
}
```

**Categories Included:**
1. Basic Exploration (4 suggestions)
2. Protein Interactions (5 suggestions)
3. Disease & Biomarkers (4 suggestions)
4. Gene-Protein-Disease Pathways (5 suggestions)
5. Variant Analysis (5 suggestions)
6. Pathways & Metabolites (5 suggestions)
7. Multi-hop Traversals (6 suggestions)
8. Protein Modifications (4 suggestions)
9. Structure & Function (5 suggestions)
10. Network Analytics (6 suggestions)
11. Research & Publications (4 suggestions)

**Total:** 53 curated suggestions emphasizing complex, multi-hop queries

### Example Suggestions by Category

Based on the actual database schema (biomedical/proteomics knowledge graph), the suggestions emphasize **complex, interesting queries** that showcase the power of graph databases. The focus is on multi-hop traversals, pattern matching, and analytical queries that would be difficult for users to construct manually.

**Basic Exploration (Simple - for onboarding):**
- "Show me 20 proteins"
- "Find all genes"
- "Display all diseases"
- "Show me pathways"
- "Find all known variants"

**Disease & Biomarkers (Moderate complexity):**
- "What proteins are biomarkers of diseases?"
- "Show me diseases and their associated proteins"
- "Find all proteins detected in disease pathology samples"
- "Which diseases are mentioned in publications?"
- "Show me diseases and their parent disease categories"

**Protein Interactions (Complex - emphasis):**
- "Which proteins interact with each other?"
- "Find proteins that are part of protein complexes"
- "Show me proteins that act on other proteins"
- "Find proteins with more than 10 interaction partners"
- "Discover protein interaction networks"
- "Show me proteins that share common interaction partners"

**Gene-Protein-Disease Pathways (Complex - emphasis):**
- "Find genes that are transcribed into proteins associated with diseases"
- "Show me the path from genes to proteins to diseases"
- "Which genes have variants found in GWAS studies?"
- "Find proteins translated from genes located on specific chromosomes"
- "Show me genes, their transcripts, and resulting proteins"

**Variant Analysis (Complex - emphasis):**
- "Find all known variants and their clinical relevance"
- "Which variants affect protein interactions?"
- "Show me variants found in genes, proteins, and chromosomes"
- "Find clinically relevant variants associated with diseases"
- "Which variants are mentioned in GWAS studies?"
- "Show me variants that affect protein functional regions"

**Pathway & Metabolite Networks (Complex - emphasis):**
- "Find proteins annotated in pathways"
- "Show me metabolites associated with diseases"
- "Which metabolites are found in specific cellular components?"
- "Find pathways containing proteins associated with diseases"
- "Show me metabolites associated with biological processes"

**Multi-hop Traversals (Complex - emphasis):**
- "Find diseases connected to proteins through biomarker relationships"
- "Show me the path from genes to proteins to complexes to tissues"
- "Which proteins are connected through exactly 3 interaction hops?"
- "Find indirect connections between diseases through shared proteins"
- "Show me genes that produce proteins that are substrates of other proteins"
- "Discover protein modification cascades"

**Publication & Research (Moderate complexity):**
- "Which proteins are most frequently mentioned in publications?"
- "Find GWAS studies and their associated traits"
- "Show me publications about specific diseases"
- "Which proteins have the most research publications?"
- "Find GWAS studies that study specific diseases"

**Protein Modifications (Complex - emphasis):**
- "Show me modified proteins and their modifications"
- "Find proteins with specific modification sites"
- "Which proteins are substrates of other proteins?"
- "Show me peptides with modified sites"
- "Find modification cascades in protein networks"

**Structural & Functional Analysis (Complex - emphasis):**
- "Find proteins with known 3D structures"
- "Show me functional regions found in proteins"
- "Which proteins are associated with specific molecular functions?"
- "Find proteins located in specific cellular components"
- "Show me proteins involved in specific biological processes"

**Project & Sample Analysis (Moderate complexity):**
- "Show me projects studying specific diseases"
- "Find analytical samples that quantified specific proteins"
- "Which projects are studying specific tissues?"
- "Show me the relationship between subjects, samples, and proteins"
- "Find modified proteins quantified in analytical samples"

**Network Analytics (Complex - emphasis):**
- "Which proteins have the most connections in the network?"
- "Find hub proteins with more than 20 relationships"
- "Show me the most connected diseases"
- "Which genes have the most variants?"
- "Find proteins that bridge different disease areas"
- "Show me the distribution of protein interactions by type"

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After analyzing all acceptance criteria, several properties can be consolidated:

**Redundancies Identified:**
- Properties 6.1, 6.4 (both test that generated suggestions use actual node labels) → Combine into one
- Properties 6.2, 6.5 (both test that generated suggestions use actual relationship types) → Combine into one
- Properties 1.3, 3.4 (both test that suggestions contain required fields) → Combine into one
- Properties 5.1, 5.3 (both test active suggestion styling) → Combine into one

**Properties to Test:**

1. **Suggestion rendering completeness** (combines 1.3, 3.4)
2. **Query execution with correct parameters** (2.1)
3. **Visual feedback during execution** (2.2)
4. **Disabled state during execution** (2.5)
5. **Category grouping** (4.1)
6. **Category header rendering** (4.2)
7. **Category ordering** (4.3)
8. **Empty category filtering** (4.4)
9. **Active suggestion highlighting** (combines 5.1, 5.3)
10. **Schema-aware node label usage** (combines 6.1, 6.4)
11. **Schema-aware relationship usage** (combines 6.2, 6.5)
12. **Complexity metadata presence** (7.5)
13. **Scroll position preservation** (8.3)
14. **Active tab styling** (8.5)

### Correctness Properties

Property 1: Suggestion rendering completeness
*For any* query suggestion loaded from the configuration, the rendered component should display the query text, category name, and description (if present)
**Validates: Requirements 1.3, 3.4**

Property 2: Query execution with correct parameters
*For any* query suggestion, when clicked, the system should call the search handler with the suggestion's query text and type 'natural'
**Validates: Requirements 2.1**

Property 3: Visual feedback during execution
*For any* query suggestion that is currently executing, the system should display a loading indicator or disabled state
**Validates: Requirements 2.2**

Property 4: Disabled state during execution
*For any* query suggestion, when any query is executing, clicking that suggestion should be prevented (disabled state)
**Validates: Requirements 2.5**

Property 5: Category grouping
*For any* set of query suggestions with category assignments, the rendered output should group suggestions under their respective category headers
**Validates: Requirements 4.1**

Property 6: Category header rendering
*For any* category that contains at least one suggestion, the rendered output should include a header displaying the category name
**Validates: Requirements 4.2**

Property 7: Category ordering
*For any* set of categories with defined order values, the rendered categories should appear sorted by their order property in ascending order
**Validates: Requirements 4.3**

Property 8: Empty category filtering
*For any* category with zero suggestions, that category should not appear in the rendered output
**Validates: Requirements 4.4**

Property 9: Active suggestion highlighting
*For any* query suggestion that is marked as active, the rendered component should apply distinct visual styling (e.g., background color, border) different from inactive suggestions
**Validates: Requirements 5.1, 5.3**

Property 10: Schema-aware node label usage
*For any* generated query suggestion that references node types, all referenced node labels should exist in the current database schema
**Validates: Requirements 6.1, 6.4**

Property 11: Schema-aware relationship usage
*For any* generated query suggestion that references relationships, all referenced relationship types should exist in the current database schema
**Validates: Requirements 6.2, 6.5**

Property 12: Complexity metadata presence
*For any* query suggestion loaded from the configuration, the suggestion object should contain a complexity field with a valid value ('basic', 'intermediate', or 'advanced')
**Validates: Requirements 7.5**

Property 13: Scroll position preservation
*For any* scroll position within a tab, switching to another tab and then returning should restore the original scroll position
**Validates: Requirements 8.3**

Property 14: Active tab styling
*For any* tab that is currently active, the rendered tab component should apply distinct visual styling different from inactive tabs
**Validates: Requirements 8.5**

## Error Handling

### JSON Loading Errors

**Malformed JSON:**
- Catch parse errors during JSON.parse()
- Log error to console with details
- Display empty state with message: "Unable to load query suggestions"
- Provide fallback to empty suggestions array

**Missing File:**
- Catch fetch errors (404)
- Log warning to console
- Display empty state with message: "No query suggestions available"
- Optionally provide hardcoded fallback suggestions

**Invalid Schema:**
- Validate loaded JSON against expected structure
- Log validation errors
- Filter out invalid suggestions
- Display valid suggestions only

### Query Execution Errors

All query execution errors are handled by the existing error handling system:
- OpenAI API errors → Displayed via existing error modal
- Neo4j query errors → Displayed via existing error notification
- Network errors → Displayed via existing error handling

The QuerySuggestionsPanel should not implement custom error handling for query execution, only for loading suggestions.

### Edge Cases

**Empty Suggestions:**
- Display friendly empty state with icon and message
- Suggest checking the configuration file
- Provide link to documentation (optional)

**No Categories:**
- Treat as empty suggestions
- Display same empty state

**Single Category:**
- Render without collapsible sections (optional optimization)
- Or render with collapse functionality for consistency

**Very Long Query Text:**
- Truncate with ellipsis after 100 characters
- Show full text in tooltip on hover
- Allow expansion on click (optional)

## Testing Strategy

### Unit Testing

**Component Tests:**
- QuerySuggestionsPanel renders correctly with mock data
- QuerySuggestionItem handles click events
- Tab switching updates active tab state
- Collapsed state is preserved across tab switches
- Empty state displays when no suggestions available
- Loading state displays during initial load

**Hook Tests:**
- useQuerySuggestions loads data from JSON
- useQuerySuggestions handles fetch errors gracefully
- useQuerySuggestions caches loaded suggestions
- useQuerySuggestions validates JSON structure

**Integration Tests:**
- Clicking suggestion triggers search handler
- Active suggestion is highlighted correctly
- Query execution disables all suggestions
- Tab switching doesn't trigger data fetching

### Property-Based Testing

Property-based tests will use **fast-check** library for TypeScript/React. Each test should run a minimum of 100 iterations.

**Property Test 1: Suggestion rendering completeness**
- Generate random QuerySuggestion objects
- Render QuerySuggestionItem component
- Verify rendered output contains query text, category, and description
- **Feature: query-suggestions, Property 1: Suggestion rendering completeness**

**Property Test 2: Query execution parameters**
- Generate random query suggestions
- Simulate click on each suggestion
- Verify search handler called with correct query text and type 'natural'
- **Feature: query-suggestions, Property 2: Query execution with correct parameters**

**Property Test 3: Category grouping**
- Generate random sets of suggestions with various categories
- Render QuerySuggestionsPanel
- Verify suggestions are grouped under correct category headers
- **Feature: query-suggestions, Property 5: Category grouping**

**Property Test 4: Category ordering**
- Generate random categories with different order values
- Render QuerySuggestionsPanel
- Verify categories appear in ascending order by order property
- **Feature: query-suggestions, Property 7: Category ordering**

**Property Test 5: Empty category filtering**
- Generate random categories, some with zero suggestions
- Render QuerySuggestionsPanel
- Verify empty categories do not appear in output
- **Feature: query-suggestions, Property 8: Empty category filtering**

**Property Test 6: Active suggestion styling**
- Generate random suggestions
- Mark random suggestion as active
- Verify active suggestion has distinct styling
- **Feature: query-suggestions, Property 9: Active suggestion highlighting**

**Property Test 7: Complexity metadata**
- Generate random suggestions
- Verify each has valid complexity value
- **Feature: query-suggestions, Property 12: Complexity metadata presence**

### Test Configuration

```typescript
// fast-check configuration
const fcConfig = {
  numRuns: 100,
  verbose: true,
  seed: Date.now()
};
```

### Testing Tools

- **Unit Tests:** Vitest + React Testing Library
- **Property Tests:** fast-check
- **Component Tests:** @testing-library/react
- **Mock Data:** Custom generators for QuerySuggestion and QuerySuggestionCategory

## Implementation Notes

### Important Constraints

**Neo4j Read-Only Mode:**
- The application uses Neo4j in **read-only mode**
- No write operations are permitted to the Neo4j database
- All queries generated from suggestions must be SELECT/MATCH operations only
- No CREATE, UPDATE, DELETE, or MERGE operations
- User preferences, favorites, or analytics cannot be stored in Neo4j
- Any future features requiring persistence need a separate application database

**Query Complexity Focus:**
- Suggestions should emphasize **complex, multi-hop queries**
- Showcase graph database capabilities (paths, patterns, traversals)
- Simple queries are included only for onboarding new users
- The majority of suggestions should be intermediate to advanced complexity
- Complex queries demonstrate value and encourage exploration

### Performance Considerations

**JSON Loading:**
- Load suggestions once on mount
- Cache in memory for component lifetime
- Consider lazy loading if file becomes large (>100KB)

**Rendering:**
- Use React.memo for QuerySuggestionItem to prevent unnecessary re-renders
- Virtualize suggestion list if count exceeds 50 items
- Debounce search handler calls if needed

**State Management:**
- Keep suggestion state local to QuerySuggestionsPanel
- Only lift active query state to parent if needed for other features
- Use useCallback for event handlers to prevent re-renders

### Accessibility

**Keyboard Navigation:**
- Tab key navigates between suggestions
- Enter/Space activates selected suggestion
- Arrow keys navigate within category
- Escape closes expanded category (if collapsible)

**Screen Readers:**
- Use semantic HTML (nav, button, list)
- Add aria-label to suggestion items
- Add aria-expanded for collapsible categories
- Announce active suggestion state
- Announce loading state during execution

**Focus Management:**
- Maintain focus on clicked suggestion during execution
- Return focus to suggestion after execution completes
- Visible focus indicators for keyboard users

### Extensibility

**Adding New Suggestions:**
1. Edit `src/data/querySuggestions.json`
2. Add new suggestion object to appropriate category
3. Reload application to see changes

**Adding New Categories:**
1. Add new category object to JSON
2. Set appropriate order value
3. Add suggestions to category
4. Reload application

**Dynamic Suggestion Generation:**
- Future enhancement: Generate suggestions based on schema
- Use schema information to create personalized queries
- Filter suggestions based on available node types
- Suggest queries based on user's query history

**Suggestion Analytics (Future Enhancement):**
- Track which suggestions are most used
- Provide feedback to improve suggestion quality
- A/B test different suggestion phrasings
- **Note:** Would require separate database (not Neo4j) for storing analytics

**User Favorites (Future Enhancement - Out of Scope):**
- Allow users to bookmark favorite queries
- **Important:** This feature requires a separate application database
- **Constraint:** Neo4j is used in read-only mode - no writes allowed
- **Implementation:** Would need PostgreSQL, MongoDB, or similar for user data
- **Scope:** Not included in current implementation

## Migration Path

### Phase 1: Core Implementation
1. Create data types and JSON structure
2. Implement useQuerySuggestions hook
3. Create QuerySuggestionItem component
4. Create QuerySuggestionsPanel component
5. Add basic styling

### Phase 2: Integration
1. Modify TaxonomySidebar to support tabs
2. Wire up query selection to search handler
3. Add active state management
4. Test integration with existing features

### Phase 3: Polish
1. Add animations and transitions
2. Implement collapsible categories
3. Add empty states and error handling
4. Accessibility improvements
5. Performance optimizations

### Phase 4: Enhancement
1. Schema-aware suggestion generation
2. Suggestion analytics
3. User favorites/bookmarks
4. Custom suggestion creation
