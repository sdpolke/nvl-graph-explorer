#!/bin/bash

# Integration Test Script for Backend Proxy
# Tests all endpoints according to task 15 requirements

set -e

BASE_URL="http://localhost:3001"
PASSED=0
FAILED=0

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Backend Proxy Integration Tests"
echo "=========================================="
echo ""

# Helper function to test endpoint
test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_status="$5"
    
    echo -n "Testing: $name... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint")
    fi
    
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (Status: $status_code)"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (Expected: $expected_status, Got: $status_code)"
        echo "Response: $body"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Test 1: Health Check
echo "1. Testing Health Check Endpoint"
test_endpoint "Health check" "GET" "/health" "" "200"
echo ""

# Test 2: Neo4j Query Execution
echo "2. Testing Neo4j Query Execution"
test_endpoint "Neo4j query" "POST" "/api/neo4j/query" \
    '{"query":"MATCH (n) RETURN n LIMIT 5","parameters":{}}' "200"
echo ""

# Test 3: Node Expansion
echo "3. Testing Node Expansion"
test_endpoint "Node expansion" "POST" "/api/neo4j/expand" \
    '{"nodeId":"test-node","relationshipTypes":[],"limit":10}' "200"
echo ""

# Test 4: Schema Fetching
echo "4. Testing Schema Fetching"
test_endpoint "Schema fetch" "GET" "/api/neo4j/schema" "" "200"
echo ""

# Test 5: Node Statistics
echo "5. Testing Node Statistics"
test_endpoint "Node statistics" "GET" "/api/neo4j/statistics/nodes" "" "200"
echo ""

# Test 6: Relationship Statistics
echo "6. Testing Relationship Statistics"
test_endpoint "Relationship statistics" "GET" "/api/neo4j/statistics/relationships" "" "200"
echo ""

# Test 7: OpenAI Query Generation
echo "7. Testing OpenAI Query Generation"
test_endpoint "OpenAI query generation" "POST" "/api/openai/generate-query" \
    '{"prompt":"Find all users","schema":{"nodeLabels":["User"],"relationshipTypes":[]}}' "200"
echo ""

# Test 8: Error Handling - Invalid Request
echo "8. Testing Error Handling"
test_endpoint "Invalid query (missing fields)" "POST" "/api/neo4j/query" \
    '{}' "400"
echo ""

# Test 9: Error Handling - Invalid JSON
echo "9. Testing Invalid JSON"
response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d 'invalid json' \
    "$BASE_URL/api/neo4j/query")
status_code=$(echo "$response" | tail -n1)
if [ "$status_code" = "400" ]; then
    echo -e "Testing: Invalid JSON... ${GREEN}✓ PASSED${NC} (Status: $status_code)"
    PASSED=$((PASSED + 1))
else
    echo -e "Testing: Invalid JSON... ${RED}✗ FAILED${NC} (Expected: 400, Got: $status_code)"
    FAILED=$((FAILED + 1))
fi
echo ""

# Test 10: Rate Limiting
echo "10. Testing Rate Limiting (sending 150 requests)"
echo -n "Sending requests... "
rate_limit_hit=false
for i in {1..150}; do
    status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")
    if [ "$status" = "429" ]; then
        rate_limit_hit=true
        echo -e "${GREEN}✓ PASSED${NC} (Rate limit triggered at request $i)"
        PASSED=$((PASSED + 1))
        break
    fi
done

if [ "$rate_limit_hit" = false ]; then
    echo -e "${YELLOW}⚠ WARNING${NC} (Rate limit not triggered after 150 requests)"
    echo "Note: This might be expected if rate limit is set higher than 150"
fi
echo ""

# Test 11: Credentials Not Exposed
echo "11. Testing Credentials Not Exposed in Browser"
echo -n "Checking health endpoint response... "
health_response=$(curl -s "$BASE_URL/health")
if echo "$health_response" | grep -qi "password\|apikey\|secret\|credential"; then
    echo -e "${RED}✗ FAILED${NC} (Credentials found in response)"
    FAILED=$((FAILED + 1))
else
    echo -e "${GREEN}✓ PASSED${NC} (No credentials exposed)"
    PASSED=$((PASSED + 1))
fi
echo ""

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo "Total: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
fi
