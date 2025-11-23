# Requirements Document

## Introduction

The statistics dashboard currently experiences slow data fetching times due to expensive database queries that run on every request. This feature will implement comprehensive caching at both frontend and backend levels to improve performance and user experience.

## Glossary

- **Statistics Dashboard**: The UI component displaying node and relationship statistics from the Neo4j database
- **Session Cache**: Browser-based storage (sessionStorage) that persists data for the duration of the browser session
- **Backend Cache**: Server-side in-memory cache that stores query results
- **Cache TTL**: Time-To-Live, the duration for which cached data remains valid
- **Aggregated Data**: Pre-computed statistics including node counts and relationship counts

## Requirements

### Requirement 1

**User Story:** As a user, I want the statistics dashboard to load quickly on subsequent visits, so that I can access information without waiting for database queries.

#### Acceptance Criteria

1. WHEN a user loads the statistics dashboard for the first time in a session THEN the system SHALL fetch data from the backend and store it in session cache
2. WHEN a user navigates away and returns to the statistics dashboard within the same session THEN the system SHALL load data from session cache without making backend requests
3. WHEN cached data exists in session storage THEN the system SHALL display it within 100 milliseconds
4. WHEN the user manually refreshes the dashboard THEN the system SHALL fetch fresh data and update the session cache
5. WHEN the browser session ends THEN the system SHALL clear all cached statistics data

### Requirement 2

**User Story:** As a system administrator, I want the backend to cache expensive database queries, so that multiple users can benefit from reduced database load.

#### Acceptance Criteria

1. WHEN the backend receives a node statistics request THEN the system SHALL check the cache before querying the database
2. WHEN cached statistics exist and are not expired THEN the system SHALL return cached data within 10 milliseconds
3. WHEN cached statistics are expired or missing THEN the system SHALL query the database and cache the results
4. WHEN the backend caches query results THEN the system SHALL set a TTL of 30 minutes
5. WHEN the cache TTL expires THEN the system SHALL automatically remove stale entries

### Requirement 3

**User Story:** As a user, I want to see when statistics were last updated, so that I know if the data is current.

#### Acceptance Criteria

1. WHEN statistics are displayed THEN the system SHALL show a timestamp indicating when the data was fetched
2. WHEN data is loaded from cache THEN the system SHALL display the original fetch timestamp
3. WHEN the user hovers over the timestamp THEN the system SHALL show whether data is from cache or live
4. WHEN cached data is older than 30 minutes THEN the system SHALL display a visual indicator suggesting refresh
5. WHEN the user clicks refresh THEN the system SHALL update the timestamp to the current time

### Requirement 4

**User Story:** As a developer, I want cache invalidation controls, so that I can ensure users see fresh data when the database changes.

#### Acceptance Criteria

1. WHEN the backend cache is invalidated THEN the system SHALL remove all cached statistics entries
2. WHEN a manual refresh is triggered THEN the system SHALL bypass both frontend and backend caches
3. WHEN the system detects a cache miss THEN the system SHALL log the event for monitoring
4. WHEN cache operations fail THEN the system SHALL fall back to direct database queries
5. WHEN the backend restarts THEN the system SHALL rebuild the cache on first request

### Requirement 5

**User Story:** As a user, I want relationship statistics to be cached per node type, so that expanding node details is fast.

#### Acceptance Criteria

1. WHEN a user expands a node type for the first time THEN the system SHALL fetch relationship statistics and cache them
2. WHEN a user expands the same node type again THEN the system SHALL load data from cache
3. WHEN relationship statistics are cached THEN the system SHALL store them with the same TTL as node statistics
4. WHEN the session cache contains relationship data THEN the system SHALL restore expanded states on page reload
5. WHEN the cache size exceeds 5MB THEN the system SHALL remove least recently used entries
