# Node Statistics Dashboard - Design Document

## Overview

The Node Statistics Dashboard provides a comprehensive visual analytics interface for exploring graph database composition and structure. This feature transforms raw database statistics into intuitive visualizations including bar charts, pie charts, and interactive tables. Users can quickly understand node type distributions, relationship patterns, and overall graph structure without navigating complex graph layouts.

The dashboard integrates seamlessly with the existing application architecture, adding a new "Statistics" tab to the TabNavigation component and leveraging the existing Neo4jService for data fetching.

## Architecture

### Component Hierarchy

```
App
├── TabNavigation (modified to include Statistics tab)
└── StatisticsDashboard (new)
    ├── StatisticsHeader (new)
    │   ├── RefreshButton
    │   ├── ExportButton
    │   └── LastUpdatedTimestamp
    ├── StatisticsCharts (new)
    │   ├── NodeCountBarChart
    │   └── NodeDistributionPieChart
    └── NodeTypeTable (new)
        └── RelationshipDetails (expandable rows)
```

### Data Flow

1. User navigates to Statistics tab
2. StatisticsDashboard component mounts and triggers data fetch
3. Neo4jService executes aggregation queries in parallel
4. Statistics data is cached in component state
5. Charts and tables render with fetched data
6. User interactions (refresh, export, expand) trigger appropriate handlers

### State Management

The Statistics feature will use local component state (React hooks) rather than global context, as the statistics data is view-specific and doesn't need to be shared across the application.

```typescript
interface StatisticsState {
  nodeStats: NodeStatistic[];
  relationshipStats: Map<string, RelationshipStatistic[]>;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  expandedNodeTypes: Set<string>;
}
```

## Components and Interfaces

### 1. StatisticsDashboard Component

**Purpose:** Main container component that orchestrates data fetching and renders child components.

**Props:**
```typescript
interface StatisticsDashboardProps {
  // No props needed - component manages its own state
}
```

**State:**
```typescript
interface StatisticsDashboardState {
  nodeStats: NodeStatistic[];
  relationshipStats: Map<string, RelationshipStatistic[]>;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  expandedNodeTypes: Set<string>;
}
```

**Key Methods:**
- `fetchStatistics()`: Orchestrates parallel data fetching
- `handleRefresh()`: Re-fetches all statistics
- `handleExport(format: 'csv' | 'json')`: Exports statistics data
- `handleNodeTypeExpand(nodeType: string)`: Fetches relationship details for a node type

**Responsibilities:**
- Fetch node and relationship statistics on mount
- Manage loading and error states
- Cache data for 5 minutes to reduce database load
- Coordinate child component rendering

### 2. StatisticsHeader Component

**Purpose:** Displays controls and metadata for the statistics view.

**Props:**
```typescript
interface StatisticsHeaderProps {
  onRefresh: () => void;
  onExport: (format: 'csv' | 'json') => void;
  isLoading: boolean;
  lastUpdated: Date | null;
}
```

**UI Elements:**
- Refresh button with loading spinner
- Export dropdown (CSV/JSON options)
- Last updated timestamp
- Total node count summary

### 3. StatisticsCharts Component

**Purpose:** Renders visual charts for node statistics.

**Props:**
```typescript
interface StatisticsChartsProps {
  nodeStats: NodeStatistic[];
  isLoading: boolean;
}
```

**Chart Library:** We'll use **Recharts** (lightweight, React-friendly, no external dependencies beyond React)

**Charts:**
1. **Bar Chart**: Node types on X-axis, counts on Y-axis
   - Color-coded bars using existing nodeStyleConfig colors
   - Sorted by count (descending)
   - Responsive width
   - Tooltips showing exact counts

2. **Pie Chart**: Proportional distribution of node types
   - Color-coded segments using nodeStyleConfig colors
   - Labels showing percentage and count
   - Legend with node type names
   - Interactive hover effects

### 4. NodeTypeTable Component

**Purpose:** Displays detailed node statistics in a sortable, expandable table.

**Props:**
```typescript
interface NodeTypeTableProps {
  nodeStats: NodeStatistic[];
  relationshipStats: Map<string, RelationshipStatistic[]>;
  expandedNodeTypes: Set<string>;
  onNodeTypeExpand: (nodeType: string) => void;
  isLoading: boolean;
}
```

**Table Columns:**
- Color indicator (circle using nodeStyleConfig color)
- Node Type (sortable)
- Count (sortable, default sort descending)
- Expand/Collapse icon

**Expandable Row Content:**
When a row is expanded, show relationship statistics:
- Relationship type
- Direction (incoming/outgoing)
- Count
- Connected node types
- Sampling indicator (if data is sampled)

**Features:**
- Click to expand/collapse rows
- Sort by node type or count
- Virtualized scrolling for all datasets (using react-window)
- Loading spinner while fetching relationship stats
- "Based on sample of X nodes" badge when applicable
- Limit expanded rows to 3 concurrent (auto-collapse oldest)

## Data Models

### NodeStatistic

```typescript
interface NodeStatistic {
  label: string;           // Node type label (e.g., "Gene", "Protein")
  count: number;           // Total count of nodes with this label
  color: string;           // Color from nodeStyleConfig
  percentage: number;      // Percentage of total nodes
}
```

### RelationshipStatistic

```typescript
interface RelationshipStatistic {
  type: string;                    // Relationship type (e.g., "ENCODES")
  direction: 'incoming' | 'outgoing';
  count: number;                   // Count of relationships
  connectedNodeTypes: string[];    // Node types on the other end
  isSampled: boolean;              // Whether this is based on a sample
  sampleSize?: number;             // Size of sample if isSampled is true
  totalNodes?: number;             // Total nodes of this type in database
}
```

### ExportData

```typescript
interface ExportData {
  timestamp: string;
  totalNodes: number;
  nodeStatistics: Array<{
    nodeType: string;
    count: number;
    percentage: number;
  }>;
  relationshipStatistics?: Array<{
    nodeType: string;
    relationships: Array<{
      type: string;
      direction: string;
      count: number;
      connectedNodeTypes: string[];
    }>;
  }>;
}
```

## Neo4j Service Extensions

### New Methods in Neo4jService

#### 1. getNodeStatistics()

```typescript
async getNodeStatistics(options?: { limit?: number; offset?: number }): Promise<NodeStatistic[]>
```

**Cypher Query (Optimized for Large Databases):**
```cypher
CALL db.labels() YIELD label
CALL {
  WITH label
  MATCH (n) WHERE label IN labels(n)
  RETURN count(n) AS count
}
RETURN label, count
ORDER BY count DESC
LIMIT $limit
SKIP $offset
```

**Alternative Query (if APOC is available):**
```cypher
CALL apoc.meta.stats() YIELD labels
UNWIND keys(labels) AS label
RETURN label, labels[label] AS count
ORDER BY count DESC
LIMIT $limit
SKIP $offset
```

**Processing:**
- Check if APOC is available, use faster query if so
- Execute query with pagination (default limit: 50)
- Map results to NodeStatistic objects
- Add color from nodeStyleConfig
- Calculate percentages based on total
- Return sorted array
- Cache results for 30 minutes

**Performance Notes:**
- For 18M nodes, this query should complete in <5 seconds
- Uses label indexes (built-in to Neo4j)
- Pagination prevents memory issues
- APOC version is 10x faster for large databases

#### 2. getRelationshipStatistics()

```typescript
async getRelationshipStatistics(
  nodeLabel: string, 
  options?: { sampleSize?: number }
): Promise<RelationshipStatistic[]>
```

**Cypher Queries (optimized with sampling for large node types):**

First, check node count:
```cypher
MATCH (n:`${nodeLabel}`)
RETURN count(n) AS totalCount
```

If totalCount > 10,000, use sampling. Otherwise, use full scan.

**Outgoing relationships (with sampling):**
```cypher
MATCH (n:`${nodeLabel}`)
WITH n LIMIT $sampleSize
MATCH (n)-[r]->(m)
WITH type(r) AS relType, labels(m) AS targetLabels, count(*) AS sampleCount
UNWIND targetLabels AS targetLabel
WITH relType, targetLabel, sum(sampleCount) AS count
RETURN relType, 'outgoing' AS direction, targetLabel, count
ORDER BY count DESC
LIMIT 100
```

**Incoming relationships (with sampling):**
```cypher
MATCH (n:`${nodeLabel}`)
WITH n LIMIT $sampleSize
MATCH (n)<-[r]-(m)
WITH type(r) AS relType, labels(m) AS sourceLabels, count(*) AS sampleCount
UNWIND sourceLabels AS sourceLabel
WITH relType, sourceLabel, sum(sampleCount) AS count
RETURN relType, 'incoming' AS direction, sourceLabel, count
ORDER BY count DESC
LIMIT 100
```

**Processing:**
- Check node count first
- If count > 10,000, use sampling (default: 10,000 nodes)
- Execute both queries in parallel
- Combine results
- Group by relationship type and direction
- Add `isSampled: boolean` flag to results
- Return RelationshipStatistic array with sampling metadata
- Cache results for 30 minutes per node type

**Performance Notes:**
- Sampling ensures queries complete in <5 seconds even for millions of nodes
- UI shows "Based on sample of 10,000 nodes" when sampled
- Limit to top 100 relationship patterns to prevent UI overload
- Cache aggressively since relationship patterns change slowly

#### 3. getAllNodeLabels()

```typescript
async getAllNodeLabels(): Promise<string[]>
```

**Cypher Query:**
```cypher
CALL db.labels() YIELD label
RETURN label
ORDER BY label
```

This method already exists in the schema fetching logic but will be extracted for reuse.

## Error Handling

### Error Scenarios

1. **Database Connection Error**
   - Display: "Unable to connect to database. Please check your connection."
   - Action: Show retry button
   - Preserve: Previous data if available

2. **Query Timeout**
   - Display: "Query timed out. The database may be under heavy load."
   - Action: Show retry button with exponential backoff
   - Fallback: Offer to load cached data

3. **Empty Database**
   - Display: "No data found in the database."
   - Action: Show helpful message about adding data
   - UI: Show empty state illustration

4. **Partial Data Load**
   - Display: Warning banner indicating incomplete data
   - Action: Show which statistics failed to load
   - Behavior: Display available data

### Error Component

```typescript
interface StatisticsErrorProps {
  error: string;
  onRetry: () => void;
  hasCachedData: boolean;
}
```

## Testing Strategy

### Unit Tests

1. **StatisticsDashboard Component**
   - Test data fetching on mount
   - Test refresh functionality
   - Test export functionality (CSV and JSON)
   - Test error handling
   - Test caching behavior

2. **StatisticsCharts Component**
   - Test chart rendering with various data sizes
   - Test empty state
   - Test color mapping from nodeStyleConfig

3. **NodeTypeTable Component**
   - Test sorting functionality
   - Test expand/collapse behavior
   - Test virtualization with large datasets

4. **Neo4jService Extensions**
   - Test getNodeStatistics query execution
   - Test getRelationshipStatistics query execution
   - Test data transformation logic
   - Test error handling

### Integration Tests

1. **End-to-End Statistics Flow**
   - Navigate to Statistics tab
   - Verify data loads correctly
   - Test refresh button
   - Test export functionality
   - Test expand/collapse in table

2. **Tab Navigation**
   - Switch between tabs
   - Verify statistics data persists
   - Verify no unnecessary re-fetching

### Performance Tests

1. **Large Dataset Handling**
   - Test with 100+ node types
   - Verify virtualization works
   - Measure render time

2. **Query Performance**
   - Measure query execution time
   - Test parallel query execution
   - Verify caching reduces load

## UI/UX Design

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Statistics Dashboard                    [Refresh] [Export ▼] │
│ Last updated: 2 minutes ago                                  │
│ Total Nodes: 18,234,567  |  Node Types: 47                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │   Bar Chart          │  │   Pie Chart          │        │
│  │   (Top 50 Types)     │  │   (Top 10 Types)     │        │
│  │                      │  │                      │        │
│  │  ████ Gene: 8.2M     │  │      ◐ Gene 45%     │        │
│  │  ███  Protein: 6.1M  │  │      ◑ Protein 33%  │        │
│  │  ██   Disease: 2.8M  │  │      ◒ Disease 15%  │        │
│  │  █    Drug: 1.1M     │  │      ◓ Other 7%     │        │
│  └──────────────────────┘  └──────────────────────┘        │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│  Node Type Details (Virtualized Scrolling)                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ● Gene                      8,234,567        [▼]     │  │
│  │   ⓘ Based on sample of 10,000 nodes                 │  │
│  │   → ENCODES → Protein: 987,234                       │  │
│  │   ← ASSOCIATED_WITH ← Disease: 234,123               │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │ ● Protein                   6,123,456        [▶]     │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │ ● Disease                   2,876,543        [▶]     │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │ ... (virtualized - only visible rows rendered)       │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Color Scheme

- Use existing nodeStyleConfig colors for consistency
- Charts and table indicators match graph visualization colors
- Neutral background (#f8f9fa)
- Accent color for interactive elements (#4a89dc)

### Responsive Design

- Desktop (>1024px): Side-by-side charts, full table
- Tablet (768-1024px): Stacked charts, full table
- Mobile (<768px): Single column, simplified table

### Accessibility

- ARIA labels for all interactive elements
- Keyboard navigation support
- Screen reader friendly table structure
- High contrast mode support
- Focus indicators on all interactive elements

## Performance Considerations

### Large Database Support (18M+ Nodes)

The design must handle databases with millions of nodes efficiently. Key considerations:

1. **Query Optimization for Scale**
   - Use APOC procedures for parallel aggregation when available
   - Implement sampling for extremely large node types (>1M nodes)
   - Add query timeouts (30 seconds max)
   - Use EXPLAIN to verify query plans use indexes

2. **Progressive Loading**
   - Load top 20 node types first (by count)
   - Lazy load remaining node types on scroll
   - Show "Loading more..." indicator
   - Implement pagination for node types (50 per page)

3. **Relationship Statistics Optimization**
   - Limit relationship queries to 10,000 samples per node type
   - Use sampling: `MATCH (n:NodeType) WITH n LIMIT 10000`
   - Show "Based on sample of X nodes" disclaimer
   - Cache relationship stats aggressively (30 minutes)

4. **Memory Management**
   - Stream large result sets instead of loading all at once
   - Implement result pagination in Neo4j queries
   - Clear expanded relationship data when rows collapse
   - Limit concurrent relationship queries to 3

### Optimization Strategies

1. **Query Optimization**
   - Use aggregation queries with LIMIT clauses
   - Leverage database indexes on labels
   - Execute relationship queries only when rows are expanded
   - Implement query result caching (30-minute TTL for large DBs)
   - Add sampling for node types with >1M nodes

2. **Rendering Optimization**
   - Use React.memo for chart components
   - Implement virtual scrolling for all tables (not just >100 rows)
   - Debounce sort operations (300ms)
   - Lazy load relationship statistics
   - Limit chart data points to top 50 node types

3. **Data Caching**
   - Cache node statistics in component state with 30-minute TTL
   - Cache relationship statistics per node type (30-minute TTL)
   - Implement stale-while-revalidate pattern
   - Store last updated timestamp
   - Use IndexedDB for persistent caching across sessions

4. **Bundle Size**
   - Use Recharts (lightweight chart library)
   - Tree-shake unused chart components
   - Lazy load Statistics tab components
   - Code-split chart components

### Performance Targets

**Small Databases (<100K nodes):**
- Initial load: <2 seconds
- Chart render: <500ms
- Table sort: <200ms
- Expand row: <1 second

**Medium Databases (100K-1M nodes):**
- Initial load: <5 seconds
- Chart render: <1 second
- Table sort: <300ms
- Expand row: <2 seconds

**Large Databases (1M-10M nodes):**
- Initial load: <10 seconds
- Chart render: <2 seconds
- Table sort: <500ms
- Expand row: <3 seconds (with sampling)

**Very Large Databases (>10M nodes):**
- Initial load: <15 seconds (with progressive loading)
- Chart render: <2 seconds (top 50 types only)
- Table sort: <500ms
- Expand row: <5 seconds (with sampling and caching)
- Show sampling disclaimers throughout UI

## Dependencies

### New Dependencies

```json
{
  "recharts": "^2.10.0",
  "react-window": "^1.8.10"
}
```

**Rationale:** 

**Recharts** - Lightweight, composable charting library:
- Small bundle size (~100KB gzipped)
- No external dependencies beyond React
- Excellent TypeScript support
- Responsive and accessible by default
- Active maintenance and community

**react-window** - Efficient list virtualization:
- Essential for rendering large lists (18M nodes = potentially 100+ node types)
- Renders only visible rows (constant memory usage)
- Smooth scrolling performance
- Small bundle size (~7KB gzipped)
- Industry standard for large lists in React

### Alternative Considered

- **Chart.js**: More features but larger bundle size and requires canvas
- **Victory**: Similar to Recharts but larger bundle
- **D3.js**: Too low-level, would require significant custom code

## Migration and Rollout

### Implementation Phases

**Phase 1: Core Statistics (MVP)**
- Add Statistics tab to TabNavigation
- Implement StatisticsDashboard component
- Add getNodeStatistics() to Neo4jService
- Render basic bar chart and table
- Basic error handling

**Phase 2: Enhanced Visualizations**
- Add pie chart
- Implement color coding from nodeStyleConfig
- Add sorting to table
- Improve loading states

**Phase 3: Relationship Details**
- Add getRelationshipStatistics() to Neo4jService
- Implement expandable table rows
- Add relationship statistics display
- Optimize query performance

**Phase 4: Export and Polish**
- Implement CSV export
- Implement JSON export
- Add caching layer
- Performance optimization
- Accessibility improvements

### Backward Compatibility

This feature is purely additive and doesn't modify existing functionality. No breaking changes are introduced.

## Future Enhancements

1. **Advanced Filtering**
   - Filter statistics by property values
   - Date range filtering for temporal data
   - Custom aggregation queries

2. **Trend Analysis**
   - Historical statistics tracking
   - Growth charts over time
   - Anomaly detection

3. **Custom Dashboards**
   - User-defined metrics
   - Saved dashboard configurations
   - Dashboard sharing

4. **Real-time Updates**
   - WebSocket integration for live statistics
   - Auto-refresh option
   - Change notifications

5. **Comparison Views**
   - Compare statistics across time periods
   - Compare different databases
   - Diff visualization
