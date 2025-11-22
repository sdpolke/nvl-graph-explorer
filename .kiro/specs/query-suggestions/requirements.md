# Requirements Document

## Introduction

This feature adds a curated set of natural language query suggestions to the sidebar, enabling users to discover and explore the graph database through pre-defined, schema-aware questions. Users can click on any suggestion to automatically execute it through the existing OpenAI-to-Cypher pipeline, making complex graph queries accessible without requiring Cypher knowledge.

## Glossary

- **Query Suggestion**: A pre-written natural language question that can be executed against the graph database
- **Suggestion Panel**: A new tab in the sidebar that displays categorized query suggestions
- **Query Category**: A logical grouping of related query suggestions (e.g., "Basic Exploration", "Relationships", "Analytics")
- **Suggestion Store**: A JSON file containing all query suggestions with metadata
- **Active Query**: The currently selected or executing query suggestion
- **Schema Context**: Database schema information used to generate relevant query suggestions

## Requirements

### Requirement 1

**User Story:** As a user, I want to see a list of example queries in the sidebar, so that I can quickly explore the database without writing queries myself.

#### Acceptance Criteria

1. WHEN the application loads THEN the system SHALL display a "Suggested Queries" tab alongside the "Node Types" tab in the sidebar
2. WHEN a user clicks the "Suggested Queries" tab THEN the system SHALL display categorized query suggestions
3. WHEN query suggestions are displayed THEN the system SHALL show the query text, category, and optional description
4. WHEN no suggestions are available THEN the system SHALL display a helpful empty state message
5. WHERE the sidebar is collapsed THEN the system SHALL hide the query suggestions content

### Requirement 2

**User Story:** As a user, I want to click on a suggested query to execute it, so that I can see results without typing.

#### Acceptance Criteria

1. WHEN a user clicks a query suggestion THEN the system SHALL pass the query text to the existing search handler with type 'natural'
2. WHEN a query is executing THEN the system SHALL provide visual feedback on the clicked suggestion
3. WHEN a query completes successfully THEN the system SHALL display results in the graph canvas or results table
4. WHEN a query fails THEN the system SHALL display an error message using the existing error handling
5. WHILE a query is executing THEN the system SHALL prevent clicking other suggestions

### Requirement 3

**User Story:** As a developer, I want query suggestions stored in a JSON file, so that I can easily add, modify, or remove suggestions without code changes.

#### Acceptance Criteria

1. WHEN the application initializes THEN the system SHALL load query suggestions from a JSON configuration file
2. WHEN the JSON file is updated THEN the system SHALL reflect changes on the next application load
3. WHEN the JSON file is malformed THEN the system SHALL log an error and display an empty state
4. THE JSON structure SHALL include fields for query text, category, description, and optional metadata
5. THE JSON file SHALL support multiple categories with multiple queries per category

### Requirement 4

**User Story:** As a user, I want query suggestions organized by category, so that I can find relevant queries quickly.

#### Acceptance Criteria

1. WHEN suggestions are displayed THEN the system SHALL group queries by category
2. WHEN a category is displayed THEN the system SHALL show a category header with the category name
3. WHEN multiple categories exist THEN the system SHALL display them in a defined order
4. WHERE a category has no queries THEN the system SHALL not display that category
5. THE system SHALL support collapsible category sections for better organization

### Requirement 5

**User Story:** As a user, I want to see which query is currently active, so that I can track what I'm exploring.

#### Acceptance Criteria

1. WHEN a user clicks a query suggestion THEN the system SHALL highlight that suggestion as active
2. WHEN a new query is executed THEN the system SHALL remove the active state from the previous suggestion
3. WHEN the active query is visible THEN the system SHALL use distinct visual styling
4. WHEN a user manually types a query THEN the system SHALL clear any active suggestion highlight
5. THE active state SHALL persist while viewing the query results

### Requirement 6

**User Story:** As a developer, I want to generate schema-aware query suggestions, so that queries are relevant to the actual database content.

#### Acceptance Criteria

1. WHEN generating suggestions THEN the system SHALL use node labels from the database schema
2. WHEN generating suggestions THEN the system SHALL use relationship types from the database schema
3. WHEN the schema is unavailable THEN the system SHALL fall back to generic query suggestions
4. THE suggestion generator SHALL create queries that reference actual node types in the database
5. THE suggestion generator SHALL create queries that explore actual relationship patterns

### Requirement 7

**User Story:** As a user, I want query suggestions to include both simple and complex examples, so that I can learn progressively.

#### Acceptance Criteria

1. WHEN suggestions are displayed THEN the system SHALL include basic exploration queries
2. WHEN suggestions are displayed THEN the system SHALL include relationship traversal queries
3. WHEN suggestions are displayed THEN the system SHALL include aggregation and analytics queries
4. WHEN suggestions are displayed THEN the system SHALL include pattern matching queries
5. THE complexity SHALL be indicated through category organization or metadata

### Requirement 8

**User Story:** As a user, I want the sidebar to switch between Node Types and Suggested Queries seamlessly, so that I can use both features efficiently.

#### Acceptance Criteria

1. WHEN switching tabs THEN the system SHALL preserve the sidebar's collapsed/expanded state
2. WHEN switching tabs THEN the system SHALL maintain smooth visual transitions
3. WHEN switching tabs THEN the system SHALL remember the scroll position within each tab
4. THE tab switching SHALL not trigger any data fetching or query execution
5. THE active tab SHALL be clearly indicated with visual styling
