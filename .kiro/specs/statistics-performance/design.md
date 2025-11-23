# Design Document

## Overview

This design implements a multi-layer caching strategy to optimize statistics dashboard performance. The solution uses session storage on the frontend for persistence across page navigations and an in-memory LRU cache on the backend to reduce database load across all users.

## Architecture

### Caching Layers

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Layer                        │
│  ┌──────────────────┐         ┌──────────────────┐     │
│  │ React Component  │────────▶│ Session Storage  │     │
│  │   State Cache    │◀────────│   (Persistent)   │     │
│  └──────────────────┘         └──────────────────┘     │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼ HTTP Request (cache miss)
┌─────────────────────────────────────────────────────────┐
│                    Backend Layer                         │
│  ┌──────────────────┐         ┌──────────────────┐     │
│  │  Express Route   │────────▶│   LRU Cache      │     │
│  │    Handler       │◀────────│  (In-Memory)     │     │
│  └──────────────────┘         └──────────────────┘     │
│           │                            │                 │
│           ▼ (cache miss)               │                 │
│  ┌──────────────────┐                 │                 │
│  │  Neo4j Service   │─────────────────┘                 │
│  └──────────────────┘                                    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼ Cypher Query
                   ┌──────────────┐
                   │   Neo4j DB   │
                   └──────────────┘
```

### Cache Flow

1. **First Load**: Component → Backend → Database → Cache → Response
2. **Cached Load**: Component → Session Storage → Display (no network)
3. **Backend Cache Hit**: Component → Backend Cache → Response (no DB query)
4. **Manual Refresh**: Bypass all caches → Database → Update caches

## Components and Interfaces

### Frontend: SessionCacheService

```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: string;
}

interface SessionCacheService {
  get<T>(key: string): CacheEntry<T> | null;
  set<T>(key: string, data: T): void;
  remove(key: string): void;
  clear(): void;
  isExpired(key: string, ttl: number): boolean;
  getSize(): number;
}
```

**Responsibilities:**
- Store/retrieve data from sessionStorage
- Handle serialization/deserialization
- Track cache size and implement LRU eviction
- Provide type-safe cache operations

### Frontend: Enhanced StatisticsDashboard

```typescript
interface CachedStatisticsState {
  nodeStats: NodeStatistic[];
  relationshipStats: Map<string, RelationshipStatistic[]>;
  timestamp: number;
  source: 'cache' | 'live';
}
```

**Changes:**
- Check session cache before making API calls
- Store successful responses in session cache
- Display cache status and age
- Provide force-refresh option

### Backend: CacheService

```typescript
interface CacheService {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttl: number): void;
  delete(key: string): void;
  clear(): void;
  has(key: string): boolean;
  size(): number;
}
```

**Implementation:** Use `lru-cache` npm package
- Max size: 100 entries
- Max age: 30 minutes (1800000ms)
- Update on access: true
- Dispose callback for cleanup

### Backend: Enhanced Neo4jProxyService

**Changes:**
- Inject CacheService dependency
- Check cache before database queries
- Store query results in cache
- Add cache bypass flag for force refresh

## Data Models

### Cache Keys

```typescript
// Frontend session storage keys
const CACHE_KEYS = {
  NODE_STATS: 'stats:nodes',
  REL_STATS: (nodeLabel: string) => `stats:rels:${nodeLabel}`,
  METADATA: 'stats:metadata'
};

// Backend cache keys
const BACKEND_CACHE_KEYS = {
  NODE_STATS: (limit: number, offset: number) => 
    `neo4j:stats:nodes:${limit}:${offset}`,
  REL_STATS: (nodeLabel: string, sampleSize: number) => 
    `neo4j:stats:rels:${nodeLabel}:${sampleSize}`
};
```

### Cache Metadata

```typescript
interface CacheMetadata {
  version: string;  // '1.0.0'
  lastCleared: number;
  totalSize: number;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: First load caches data

*For any* first dashboard load in a session, after data is fetched from the backend, the session cache should contain the fetched data
**Validates: Requirements 1.1**

### Property 2: Navigation uses cache

*For any* navigation sequence (load → navigate away → return), the second load should retrieve data from session cache without making backend requests
**Validates: Requirements 1.2**

### Property 3: Cache display performance

*For any* dashboard load when cached data exists, the time from component mount to data display should be less than 100 milliseconds
**Validates: Requirements 1.3**

### Property 4: Refresh updates cache

*For any* manual refresh action, the system should fetch fresh data from the backend and update the session cache with the new data
**Validates: Requirements 1.4**

### Property 5: Backend checks cache first

*For any* node statistics request to the backend, the cache should be checked before querying the database
**Validates: Requirements 2.1**

### Property 6: Cache hit performance

*For any* backend request when valid cached data exists, the response time should be less than 10 milliseconds
**Validates: Requirements 2.2**

### Property 7: Cache miss queries database

*For any* backend request when cache is expired or missing, the system should query the database and store results in cache
**Validates: Requirements 2.3**

### Property 8: Cache TTL is 30 minutes

*For any* cached query result in the backend, the TTL should be set to 1800000 milliseconds (30 minutes)
**Validates: Requirements 2.4**

### Property 9: Expired entries are removed

*For any* cache entry that exceeds its TTL, the entry should be automatically removed from the cache
**Validates: Requirements 2.5**

### Property 10: Timestamp display

*For any* statistics display, a timestamp indicating when data was fetched should be visible in the UI
**Validates: Requirements 3.1**

### Property 11: Cached timestamp preservation

*For any* data loaded from cache, the displayed timestamp should match the original fetch time, not the cache retrieval time
**Validates: Requirements 3.2**

### Property 12: Refresh updates timestamp

*For any* refresh action, the timestamp should be updated to the current time after new data is fetched
**Validates: Requirements 3.5**

### Property 13: Cache invalidation clears all entries

*For any* cache invalidation operation, all statistics entries should be removed from the backend cache
**Validates: Requirements 4.1**

### Property 14: Manual refresh bypasses caches

*For any* manual refresh with force flag, both frontend session cache and backend cache should be bypassed
**Validates: Requirements 4.2**

### Property 15: Cache miss logging

*For any* cache miss event, a log entry should be created for monitoring purposes
**Validates: Requirements 4.3**

### Property 16: Cache failure fallback

*For any* cache operation failure, the system should fall back to querying the database directly
**Validates: Requirements 4.4**

### Property 17: First expansion caches relationships

*For any* node type expanded for the first time, relationship statistics should be fetched and stored in cache
**Validates: Requirements 5.1**

### Property 18: Subsequent expansion uses cache

*For any* node type expanded multiple times, the second and subsequent expansions should load data from cache
**Validates: Requirements 5.2**

### Property 19: Relationship TTL consistency

*For any* cached relationship statistics, the TTL should match the TTL used for node statistics (30 minutes)
**Validates: Requirements 5.3**

### Property 20: Expanded state restoration

*For any* page reload when session cache contains relationship data, the previously expanded node types should be restored to their expanded state
**Validates: Requirements 5.4**

### Property 21: LRU eviction

*For any* cache that exceeds 5MB in size, the least recently used entries should be removed until size is under the limit
**Validates: Requirements 5.5**

## Error Handling

### Cache Errors

- **Session Storage Full**: Fall back to in-memory cache, warn user
- **Serialization Failure**: Log error, skip caching, fetch from backend
- **Deserialization Failure**: Clear corrupted cache entry, fetch fresh data

### Backend Cache Errors

- **Memory Pressure**: LRU cache automatically evicts old entries
- **Cache Service Unavailable**: Bypass cache, query database directly
- **Invalid Cache Key**: Log error, generate valid key or skip caching

### Network Errors

- **Backend Unavailable**: Use stale cache if available, show warning
- **Timeout**: Retry with exponential backoff, use cache if available
- **Partial Failure**: Cache successful responses, retry failed ones

## Testing Strategy

### Unit Tests

**Frontend:**
- SessionCacheService: get/set/remove/clear operations
- Cache size calculation and LRU eviction
- Serialization/deserialization edge cases
- StatisticsDashboard cache integration

**Backend:**
- CacheService wrapper around lru-cache
- Cache key generation
- TTL expiration behavior
- Neo4jProxyService cache integration

### Property-Based Tests

Use `fast-check` library for TypeScript property-based testing. Each test should run minimum 100 iterations.

**Frontend Properties:**
- Property 1-4: Session cache behavior
- Property 10-12: Timestamp handling
- Property 17-21: Relationship caching and LRU

**Backend Properties:**
- Property 5-9: Backend cache behavior
- Property 13-16: Cache invalidation and fallback

### Integration Tests

- End-to-end cache flow: frontend → backend → database
- Cache invalidation across layers
- Performance benchmarks for cache hits vs misses
- Session persistence across page reloads

### Performance Tests

- Measure cache hit response time (target: <10ms backend, <100ms frontend)
- Measure cache miss response time
- Test cache under load (100 concurrent requests)
- Memory usage monitoring

## Implementation Notes

### Frontend Considerations

- Use `sessionStorage` API (synchronous, 5-10MB limit)
- Implement size tracking to prevent quota exceeded errors
- Use JSON serialization with error handling
- Clear cache on version mismatch

### Backend Considerations

- Use `lru-cache` npm package (battle-tested, performant)
- Configure max size and max age appropriately
- Add cache metrics for monitoring (hits, misses, evictions)
- Consider Redis for multi-instance deployments (future enhancement)

### Performance Targets

- **Frontend cache hit**: <100ms to display
- **Backend cache hit**: <10ms response time
- **Database query**: Current baseline (2-5 seconds acceptable)
- **Cache overhead**: <5ms for cache operations

### Monitoring

- Log cache hit/miss ratios
- Track cache size and eviction frequency
- Monitor response times by cache status
- Alert on cache failure rates >1%
