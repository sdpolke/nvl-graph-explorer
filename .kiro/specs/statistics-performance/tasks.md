# Implementation Plan

- [ ] 1. Set up backend caching infrastructure
  - Install `lru-cache` npm package in backend
  - Create `CacheService` class wrapping lru-cache with TTL support
  - Configure cache with max size (100 entries) and max age (30 minutes)
  - Add cache metrics tracking (hits, misses, size)
  - _Requirements: 2.1, 2.2, 2.4, 2.5_

- [ ]* 1.1 Write property test for cache TTL expiration
  - **Property 9: Expired entries are removed**
  - **Validates: Requirements 2.5**

- [ ]* 1.2 Write unit tests for CacheService
  - Test get/set/delete/clear operations
  - Test TTL expiration behavior
  - Test cache size limits
  - _Requirements: 2.1, 2.2, 2.4, 2.5_

- [ ] 2. Integrate caching into backend Neo4j service
  - Inject CacheService into Neo4jProxyService
  - Add cache check before database queries in `getNodeStatistics`
  - Add cache check before database queries in `getRelationshipStatistics`
  - Store query results in cache after successful database queries
  - Generate consistent cache keys based on query parameters
  - _Requirements: 2.1, 2.3, 4.3_

- [ ]* 2.1 Write property test for backend cache check order
  - **Property 5: Backend checks cache first**
  - **Validates: Requirements 2.1**

- [ ]* 2.2 Write property test for cache miss behavior
  - **Property 7: Cache miss queries database**
  - **Validates: Requirements 2.3**

- [ ]* 2.3 Write property test for cache miss logging
  - **Property 15: Cache miss logging**
  - **Validates: Requirements 4.3**

- [ ] 3. Add cache bypass and invalidation to backend
  - Add `bypassCache` parameter to statistics endpoints
  - Implement cache invalidation endpoint (POST /api/neo4j/cache/invalidate)
  - Add cache clear functionality to CacheService
  - Update route handlers to support cache bypass flag
  - _Requirements: 4.1, 4.2_

- [ ]* 3.1 Write property test for cache invalidation
  - **Property 13: Cache invalidation clears all entries**
  - **Validates: Requirements 4.1**

- [ ]* 3.2 Write property test for manual refresh bypass
  - **Property 14: Manual refresh bypasses caches**
  - **Validates: Requirements 4.2**

- [ ] 4. Create frontend SessionCacheService
  - Create `src/services/SessionCacheService.ts`
  - Implement get/set/remove/clear methods with sessionStorage
  - Add JSON serialization/deserialization with error handling
  - Implement cache size tracking and calculation
  - Add LRU eviction when size exceeds 5MB
  - Add cache version checking for invalidation
  - _Requirements: 1.1, 1.2, 5.5_

- [ ]* 4.1 Write property test for session cache operations
  - **Property 1: First load caches data**
  - **Validates: Requirements 1.1**

- [ ]* 4.2 Write property test for LRU eviction
  - **Property 21: LRU eviction**
  - **Validates: Requirements 5.5**

- [ ]* 4.3 Write unit tests for SessionCacheService
  - Test serialization/deserialization
  - Test size calculation
  - Test LRU eviction logic
  - Test error handling for quota exceeded
  - _Requirements: 1.1, 1.2, 5.5_

- [ ] 5. Integrate session cache into StatisticsDashboard
  - Check session cache before making API calls in `fetchStatistics`
  - Store successful API responses in session cache
  - Add cache metadata (timestamp, source) to state
  - Implement force refresh that bypasses cache
  - Update state to track whether data is from cache or live
  - _Requirements: 1.1, 1.2, 1.4, 3.2_

- [ ]* 5.1 Write property test for navigation cache usage
  - **Property 2: Navigation uses cache**
  - **Validates: Requirements 1.2**

- [ ]* 5.2 Write property test for refresh cache update
  - **Property 4: Refresh updates cache**
  - **Validates: Requirements 1.4**

- [ ]* 5.3 Write property test for cached timestamp preservation
  - **Property 11: Cached timestamp preservation**
  - **Validates: Requirements 3.2**

- [ ] 6. Add cache status UI indicators
  - Update StatisticsHeader to show cache status (cached/live)
  - Add tooltip on timestamp showing data source
  - Add visual indicator when cached data is older than 30 minutes
  - Update refresh button to show force refresh option
  - Add cache age display (e.g., "Updated 5 minutes ago")
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 6.1 Write property test for timestamp display
  - **Property 10: Timestamp display**
  - **Validates: Requirements 3.1**

- [ ]* 6.2 Write property test for refresh timestamp update
  - **Property 12: Refresh updates timestamp**
  - **Validates: Requirements 3.5**

- [ ] 7. Implement relationship statistics caching
  - Cache relationship statistics in session storage per node type
  - Check cache before fetching relationship stats in `handleNodeTypeExpand`
  - Store relationship stats with same TTL as node stats
  - Restore expanded states from session cache on page load
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ]* 7.1 Write property test for first expansion caching
  - **Property 17: First expansion caches relationships**
  - **Validates: Requirements 5.1**

- [ ]* 7.2 Write property test for subsequent expansion cache usage
  - **Property 18: Subsequent expansion uses cache**
  - **Validates: Requirements 5.2**

- [ ]* 7.3 Write property test for relationship TTL consistency
  - **Property 19: Relationship TTL consistency**
  - **Validates: Requirements 5.3**

- [ ]* 7.4 Write property test for expanded state restoration
  - **Property 20: Expanded state restoration**
  - **Validates: Requirements 5.4**

- [ ] 8. Add error handling and fallbacks
  - Add try-catch around all cache operations
  - Implement fallback to database on cache errors
  - Add error logging for cache failures
  - Handle sessionStorage quota exceeded errors
  - Show user-friendly warnings when cache is unavailable
  - _Requirements: 4.4_

- [ ]* 8.1 Write property test for cache failure fallback
  - **Property 16: Cache failure fallback**
  - **Validates: Requirements 4.4**

- [ ] 9. Add performance monitoring and logging
  - Log cache hit/miss ratios in backend
  - Add performance timing logs for cache operations
  - Track cache size and eviction events
  - Add metrics endpoint for cache statistics
  - Log cache errors with appropriate severity
  - _Requirements: 4.3_

- [ ]* 9.1 Write integration tests for cache performance
  - Test cache hit response time (<10ms backend)
  - Test frontend cache display time (<100ms)
  - Test cache under concurrent load
  - _Requirements: 1.3, 2.2_

- [ ] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Update documentation
  - Document cache configuration options
  - Add cache invalidation instructions to README
  - Document cache key structure
  - Add troubleshooting guide for cache issues
  - _Requirements: All_
