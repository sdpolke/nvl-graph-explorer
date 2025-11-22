# Query Suggestions Feature - Spec Summary

## Overview

This spec defines a new **Query Suggestions** feature that adds a curated list of natural language query examples to the sidebar. Users can click any suggestion to automatically execute it through the existing OpenAI-to-Cypher pipeline.

## Key Features

✅ **Tab-based sidebar** - Switch between "Node Types" and "Suggested Queries"
✅ **53 curated suggestions** - Based on actual database schema (biomedical/proteomics)
✅ **11 categories** - From basic exploration to complex multi-hop traversals
✅ **JSON-driven** - Easy to update without code changes
✅ **Schema-aware** - All queries reference real node types and relationships
✅ **Complex query focus** - Emphasizes advanced graph patterns and analytics
✅ **Fully accessible** - Keyboard navigation, screen reader support

## Files Created

### Spec Documents
- `requirements.md` - 8 user stories with acceptance criteria
- `design.md` - Complete architecture and component design
- `tasks.md` - 12 implementation tasks with subtasks
- `README.md` - This summary document

### Data File
- `src/data/querySuggestions.json` - 53 curated query suggestions

## Implementation Approach

The implementation follows a **phased approach**:

### Phase 1: Core Components (Tasks 1-4)
- Type definitions
- useQuerySuggestions hook
- QuerySuggestionItem component
- QuerySuggestionsPanel component

### Phase 2: Integration (Tasks 5-6)
- Add tabs to TaxonomySidebar
- Wire up to App.tsx
- Connect to existing search handler

### Phase 3: Polish (Tasks 7-8)
- Accessibility features
- Testing and validation

### Phase 4: Enhancements (Tasks 9-11)
- Collapsible categories (optional)
- Scroll position preservation (optional)
- Final polish

## Query Categories

1. **Basic Exploration** - Simple queries for onboarding
2. **Protein Interactions** - Protein-protein interaction networks
3. **Disease & Biomarkers** - Disease-protein relationships
4. **Gene-Protein-Disease Pathways** - Multi-hop traversals
5. **Variant Analysis** - Genetic variants and clinical relevance
6. **Pathways & Metabolites** - Biological pathways and metabolites
7. **Multi-hop Traversals** - Complex graph patterns (3-4 hops)
8. **Protein Modifications** - Post-translational modifications
9. **Structure & Function** - Protein structures and annotations
10. **Network Analytics** - Hub proteins, centrality, statistics
11. **Research & Publications** - GWAS studies and publications

## Example Queries

**Simple:**
- "Show me 20 proteins"
- "Find all genes"

**Complex:**
- "Find genes that are transcribed into proteins associated with diseases"
- "Which proteins are connected through exactly 3 interaction hops?"
- "Show me the path from genes to proteins to complexes to tissues"
- "Find indirect connections between diseases through shared proteins"

## Architecture Highlights

### Component Hierarchy
```
App.tsx
└── TaxonomySidebar
    ├── Tab Navigation (Node Types | Queries)
    ├── Node Types Panel (existing)
    └── QuerySuggestionsPanel (new)
        └── QuerySuggestionItem[] (new)
```

### Data Flow
```
JSON File → useQuerySuggestions Hook → QuerySuggestionsPanel → QuerySuggestionItem
                                                                        ↓
                                                                   onClick
                                                                        ↓
                                                              App.handleSearch()
                                                                        ↓
                                                              OpenAI Service
                                                                        ↓
                                                               Neo4j Service
```

## Key Design Decisions

1. **JSON Configuration** - Suggestions stored in JSON for easy updates
2. **Schema-Aware** - All queries reference actual database entities
3. **Complex Query Focus** - 70% of suggestions are intermediate/advanced
4. **Read-Only Neo4j** - No write operations to database
5. **Reuse Existing Pipeline** - Leverages existing OpenAI-to-Cypher flow
6. **Extensible Architecture** - Easy to add categories and suggestions

## Testing Strategy

### Property-Based Tests (Optional)
- Suggestion rendering completeness
- Query execution parameters
- Category grouping and ordering
- Active suggestion highlighting
- Complexity metadata presence

### Integration Tests (Optional)
- Click suggestion → triggers search
- Active suggestion highlighting
- Query execution disables suggestions
- Manual input clears active suggestion

### Manual Testing
- Empty/malformed JSON handling
- Responsive design
- Keyboard navigation
- Screen reader compatibility

## Future Enhancements (Out of Scope)

❌ **User Favorites** - Requires separate application database
❌ **Query History** - Requires separate application database
❌ **Dynamic Generation** - Generate suggestions from schema
❌ **Analytics** - Track most-used suggestions
❌ **A/B Testing** - Test different query phrasings

## Getting Started

To begin implementation:

1. Review the requirements document
2. Review the design document
3. Open `tasks.md` and start with Task 1
4. Click "Start task" next to each task item in Kiro

## Questions?

- Check the design document for detailed component specifications
- Check the requirements document for acceptance criteria
- Check the JSON file for example suggestion structure
- Ask the user for clarification on any ambiguous requirements
