# Requirements Document

## Introduction

The Node Statistics Dashboard feature provides a comprehensive visual analytics view for exploring graph database statistics. Instead of displaying nodes as a graph visualization, this feature presents node type distributions, counts, and relationships in an intuitive dashboard format using charts, tables, and metrics. This enables users to quickly understand the composition and structure of their knowledge graph without navigating through complex graph layouts.

## Glossary

- **Dashboard**: A visual interface displaying multiple statistical views and metrics about the graph database
- **Node Type**: A label or category assigned to nodes in the graph (e.g., Gene, Protein, Disease)
- **Node Count**: The total number of nodes for a specific node type in the database
- **Relationship Distribution**: The count and types of relationships connected to each node type
- **Chart Component**: A visual representation of data using bar charts, pie charts, or other visualization formats
- **Statistics View**: A dedicated tab or panel in the application showing analytical data instead of graph visualization
- **Neo4j Service**: The service layer that executes Cypher queries against the Neo4j database
- **Aggregation Query**: A Cypher query that returns computed statistics rather than individual nodes

## Requirements

### Requirement 1

**User Story:** As a researcher, I want to see an overview of all node types and their counts in a visual dashboard, so that I can quickly understand the composition of my knowledge graph.

#### Acceptance Criteria

1. WHEN the user navigates to the Statistics view, THE Dashboard SHALL fetch all node labels and their counts from the Neo4j database
2. WHEN the data is loaded, THE Dashboard SHALL display a bar chart showing node type names on the x-axis and counts on the y-axis
3. WHEN the data is loaded, THE Dashboard SHALL display a pie chart showing the proportional distribution of node types
4. WHEN the data is loading, THE Dashboard SHALL display a loading indicator to inform the user
5. IF the query fails, THEN THE Dashboard SHALL display an error message with details about the failure

### Requirement 2

**User Story:** As a data analyst, I want to see detailed statistics for each node type including relationship counts, so that I can understand how different entities are connected in the graph.

#### Acceptance Criteria

1. WHEN the user views the Statistics dashboard, THE Dashboard SHALL display a table listing each node type with its total count
2. WHEN the user clicks on a node type in the table, THE Dashboard SHALL expand to show relationship statistics for that node type
3. WHEN relationship statistics are displayed, THE Dashboard SHALL show the count of each relationship type connected to the selected node type
4. WHEN relationship statistics are displayed, THE Dashboard SHALL show both incoming and outgoing relationship counts separately
5. THE Dashboard SHALL allow users to sort the table by node type name or count

### Requirement 3

**User Story:** As a database administrator, I want to refresh the statistics on demand, so that I can see up-to-date information after making changes to the database.

#### Acceptance Criteria

1. WHEN the user clicks the refresh button, THE Dashboard SHALL re-execute all statistics queries against the database
2. WHEN the refresh is in progress, THE Dashboard SHALL disable the refresh button to prevent duplicate requests
3. WHEN the refresh completes successfully, THE Dashboard SHALL update all charts and tables with the new data
4. WHEN the refresh completes, THE Dashboard SHALL display a timestamp showing when the data was last updated
5. IF the refresh fails, THEN THE Dashboard SHALL display an error message while preserving the previous data

### Requirement 4

**User Story:** As a researcher, I want to access the Statistics dashboard from the main navigation, so that I can easily switch between graph visualization and statistical analysis.

#### Acceptance Criteria

1. WHEN the user views the application, THE TabNavigation SHALL include a "Statistics" tab alongside existing tabs
2. WHEN the user clicks the Statistics tab, THE Application SHALL display the Statistics dashboard instead of the graph view
3. WHEN the Statistics tab is active, THE Application SHALL hide the graph canvas and taxonomy sidebar
4. WHEN the user switches to another tab, THE Application SHALL preserve the statistics data in memory to avoid re-fetching
5. THE Application SHALL maintain the active tab state when the user performs searches or other operations

### Requirement 5

**User Story:** As a user with a large database, I want the statistics to load efficiently, so that I can view insights without long wait times.

#### Acceptance Criteria

1. WHEN fetching node statistics, THE Neo4j Service SHALL use optimized aggregation queries with appropriate limits
2. WHEN multiple statistics queries are needed, THE Neo4j Service SHALL execute them in parallel where possible
3. WHEN the statistics data exceeds 100 node types, THE Dashboard SHALL implement pagination or virtual scrolling
4. WHEN rendering charts, THE Dashboard SHALL use efficient chart libraries that handle large datasets
5. THE Dashboard SHALL cache statistics data for 5 minutes to reduce database load on repeated views

### Requirement 6

**User Story:** As a researcher, I want to export statistics data, so that I can use it in reports or share it with colleagues.

#### Acceptance Criteria

1. WHEN the user clicks the export button, THE Dashboard SHALL provide options to export as CSV or JSON
2. WHEN the user selects CSV export, THE Dashboard SHALL generate a CSV file containing node types and counts
3. WHEN the user selects JSON export, THE Dashboard SHALL generate a JSON file with complete statistics including relationships
4. WHEN the export is generated, THE Dashboard SHALL trigger a browser download with an appropriate filename
5. THE exported file SHALL include a timestamp indicating when the data was collected
