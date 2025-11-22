# Implementation Plan

- [x] 1. Set up dependencies and type definitions
  - Install recharts and react-window packages
  - Create TypeScript interfaces for NodeStatistic and RelationshipStatistic
  - Add sampling metadata fields to types
  - _Requirements: 1.1, 2.1_

- [x] 2. Extend Neo4jService with statistics methods
  - [x] 2.1 Implement getNodeStatistics() method with pagination
    - Write optimized Cypher query using db.labels()
    - Add APOC detection and alternative query path
    - Implement pagination parameters (limit, offset)
    - Add 30-minute caching logic
    - Handle errors and timeouts gracefully
    - _Requirements: 1.1, 5.1, 5.5_

  - [x] 2.2 Implement getRelationshipStatistics() method with sampling
    - Write node count check query
    - Implement sampling logic for large node types (>10K nodes)
    - Write optimized outgoing relationships query
    - Write optimized incoming relationships query
    - Execute queries in parallel
    - Add sampling metadata to results
    - Implement 30-minute caching per node type
    - _Requirements: 2.2, 2.3, 2.4, 5.1, 5.2_

  - [x] 2.3 Add helper method to check APOC availability
    - Query for APOC procedures
    - Cache APOC availability flag
    - _Requirements: 5.1_

- [x] 3. Create StatisticsDashboard component
  - [x] 3.1 Set up component structure and state management
    - Create StatisticsDashboard.tsx component file
    - Define component state interface
    - Initialize state with useState hooks
    - Implement useEffect for data fetching on mount
    - Add loading and error states
    - _Requirements: 1.1, 1.4, 1.5_

  - [x] 3.2 Implement data fetching logic
    - Call getNodeStatistics() on component mount
    - Handle loading states during fetch
    - Handle errors with user-friendly messages
    - Implement 30-minute cache with timestamp
    - Calculate percentages from node counts
    - _Requirements: 1.1, 1.4, 1.5, 5.5_

  - [x] 3.3 Implement refresh functionality
    - Create handleRefresh method
    - Disable refresh button during loading
    - Clear cache and re-fetch data
    - Update lastUpdated timestamp
    - Handle refresh errors
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.4 Implement node type expansion logic
    - Create handleNodeTypeExpand method
    - Fetch relationship statistics for selected node type
    - Manage expandedNodeTypes Set in state
    - Limit concurrent expanded rows to 3
    - Auto-collapse oldest when limit exceeded
    - Cache relationship stats per node type
    - _Requirements: 2.2, 2.3, 2.4, 5.2_

- [x] 4. Create StatisticsHeader component
  - Create StatisticsHeader.tsx component file
  - Add refresh button with loading spinner
  - Add export dropdown with CSV/JSON options
  - Display last updated timestamp
  - Display total node count summary
  - Display total node types count
  - Style header with consistent design
  - _Requirements: 3.1, 3.2, 3.4, 6.1_

- [x] 5. Create StatisticsCharts component
  - [x] 5.1 Set up charts component structure
    - Create StatisticsCharts.tsx component file
    - Import Recharts components
    - Define props interface
    - Add loading state handling
    - _Requirements: 1.2, 1.3_

  - [x] 5.2 Implement bar chart for node counts
    - Use Recharts BarChart component
    - Map node types to X-axis
    - Map counts to Y-axis
    - Apply colors from nodeStyleConfig
    - Sort by count descending
    - Limit to top 50 node types
    - Add tooltips with exact counts
    - Format large numbers (e.g., "8.2M")
    - Make chart responsive
    - _Requirements: 1.2, 5.1_

  - [x] 5.3 Implement pie chart for distribution
    - Use Recharts PieChart component
    - Show top 10 node types
    - Group remaining as "Other"
    - Apply colors from nodeStyleConfig
    - Add labels with percentages
    - Add legend with node type names
    - Add hover effects
    - Make chart responsive
    - _Requirements: 1.3, 5.1_

  - [x] 5.4 Add empty state handling
    - Show message when no data available
    - Style empty state appropriately
    - _Requirements: 1.5_

- [x] 6. Create NodeTypeTable component
  - [x] 6.1 Set up table component with virtualization
    - Create NodeTypeTable.tsx component file
    - Install and configure react-window
    - Define props interface
    - Set up FixedSizeList for virtualization
    - Calculate row heights
    - _Requirements: 2.1, 5.3_

  - [x] 6.2 Implement table row rendering
    - Create table row component
    - Add color indicator circle using nodeStyleConfig
    - Display node type name
    - Display count with number formatting
    - Add expand/collapse icon
    - Style rows with hover effects
    - _Requirements: 2.1, 2.2_

  - [x] 6.3 Implement sorting functionality
    - Add sort state (column, direction)
    - Create sort handlers for name and count
    - Sort data array based on active sort
    - Add sort indicators to column headers
    - Default sort by count descending
    - _Requirements: 2.5_

  - [x] 6.4 Implement expandable rows
    - Handle row click to expand/collapse
    - Fetch relationship statistics on expand
    - Show loading spinner while fetching
    - Display relationship statistics in expanded content
    - Show relationship type, direction, count
    - Show connected node types
    - Add sampling indicator badge when applicable
    - Style expanded content distinctly
    - _Requirements: 2.2, 2.3, 2.4, 5.2_

  - [x] 6.5 Implement concurrent expansion limit
    - Track expanded rows in order
    - Auto-collapse oldest when limit (3) exceeded
    - Clear relationship data for collapsed rows
    - _Requirements: 5.2_

- [ ] 7. Implement export functionality
  - [ ] 7.1 Create export utility functions
    - Create exportUtils.ts file
    - Implement CSV export function
    - Implement JSON export function
    - Add timestamp to exported data
    - Format data appropriately for each format
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

  - [ ] 7.2 Implement export handlers in StatisticsDashboard
    - Create handleExport method
    - Handle CSV export option
    - Handle JSON export option
    - Trigger browser download
    - Generate appropriate filename with timestamp
    - Include relationship stats if available
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 8. Integrate Statistics tab into application
  - [x] 8.1 Update TabNavigation component
    - Add "Statistics" tab to tabs array
    - Update tab type definitions
    - Style new tab consistently
    - _Requirements: 4.1, 4.2_

  - [x] 8.2 Update App.tsx to render Statistics view
    - Add statistics tab case to tab content rendering
    - Render StatisticsDashboard component
    - Hide graph canvas and taxonomy sidebar when Statistics tab active
    - Preserve statistics data when switching tabs
    - Update activeTab state management
    - _Requirements: 4.2, 4.3, 4.4, 4.5_

- [x] 9. Add error handling and edge cases
  - [x] 9.1 Implement error components
    - Create StatisticsError component
    - Display user-friendly error messages
    - Add retry button
    - Show cached data option if available
    - _Requirements: 1.5, 3.5_

  - [x] 9.2 Handle empty database scenario
    - Detect when no nodes exist
    - Show empty state message
    - Provide helpful guidance
    - _Requirements: 1.5_

  - [x] 9.3 Handle query timeouts
    - Set 30-second timeout on statistics queries
    - Show timeout error message
    - Offer retry with exponential backoff
    - _Requirements: 1.5, 3.5, 5.1_

  - [x] 9.4 Handle partial data load failures
    - Show warning banner for incomplete data
    - Indicate which statistics failed
    - Display available data
    - _Requirements: 1.5_

- [x] 10. Add styling and polish
  - Create StatisticsDashboard.css file
  - Style header section
  - Style charts container with responsive grid
  - Style table with proper spacing and borders
  - Add loading skeletons for better UX
  - Ensure color consistency with nodeStyleConfig
  - Implement responsive design for mobile/tablet
  - Add smooth transitions for expand/collapse
  - Style sampling indicator badges
  - _Requirements: 1.2, 1.3, 2.1_

- [x] 11. Performance optimization
  - [x] 11.1 Implement React.memo for chart components
    - Wrap StatisticsCharts with React.memo
    - Add custom comparison function if needed
    - _Requirements: 5.1_

  - [x] 11.2 Optimize re-renders
    - Use useCallback for event handlers
    - Use useMemo for computed values
    - Prevent unnecessary re-renders
    - _Requirements: 5.1_

  - [x] 11.3 Implement debouncing for sort operations
    - Add debounce utility (300ms)
    - Apply to sort handlers
    - _Requirements: 5.1_

- [x] 12. Add accessibility features
  - Add ARIA labels to all interactive elements
  - Ensure keyboard navigation works for table
  - Add focus indicators
  - Ensure screen reader compatibility
  - Test with keyboard-only navigation
  - Add high contrast mode support
  - _Requirements: 1.1, 2.1, 3.1_

- [ ] 13. Documentation and cleanup
  - Add JSDoc comments to all components
  - Add JSDoc comments to Neo4jService methods
  - Document sampling strategy in code comments
  - Update README with Statistics feature description
  - Add inline comments for complex logic
  - _Requirements: All_
