#!/bin/bash

# Backend Proxy Integration Test Script
# Tests all proxy endpoints and functionality

PROXY_URL="http://localhost:3001"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

# Helper function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        ((FAILED++))
    fi
}

echo "=========================================="
echo "Backend Proxy Integration Tests"
echo "=========================================="
echo ""

# Test 1: Health Check Endpoint
echo "Test 1: Health Check Endpoint"
RESPONSE=$(curl -s -w "\n%{http_code}" "$PROXY_URL/health")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    if echo "$BODY" | grep -q "healthy"; then
        print_result 0 "Health check returns 200 and healthy status"
    else
        print_result 1 "Health check returns 200 but missing healthy status"
    fi
else
    print_result 1 "Health check failed with HTTP $HTTP_CODE"
fi
echo ""

# Test 2: Neo4j Query Execution
echo "Test 2: Neo4j Query Execution"
QUERY_PAYLOAD='{"cypher":"MATCH (n) RETURN n LIMIT 5","params":{}}'
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$PROXY_URL/api/neo4j/query" \
    -H "Content-Type: application/json" \
    -d "$QUERY_PAYLOAD")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    if echo "$BODY" | grep -q "nodes"; then
        print_result 0 "Neo4j query execution successful"
    else
        print_result 1 "Neo4j query returned 200 but missing nodes"
    fi
else
    print_result 1 "Neo4j query failed with HTTP $HTTP_CODE"
fi
echo ""

# Test 3: Node Expansion
echo "Test 3: Node Expansion"
# First get a node ID from the nodes array
NODE_QUERY='{"cypher":"MATCH (n) RETURN n LIMIT 1","params":{}}'
NODE_RESPONSE=$(curl -s -X POST "$PROXY_URL/api/neo4j/query" \
    -H "Content-Type: application/json" \
    -d "$NODE_QUERY")

if echo "$NODE_RESPONSE" | grep -q "nodes"; then
    NODE_ID=$(echo "$NODE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    if [ -n "$NODE_ID" ]; then
        EXPAND_PAYLOAD="{\"nodeId\":\"$NODE_ID\"}"
        RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$PROXY_URL/api/neo4j/expand" \
            -H "Content-Type: application/json" \
            -d "$EXPAND_PAYLOAD")
        HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
        
        if [ "$HTTP_CODE" = "200" ]; then
            print_result 0 "Node expansion successful"
        else
            print_result 1 "Node expansion failed with HTTP $HTTP_CODE"
        fi
    else
        print_result 1 "Could not extract node ID for expansion test"
    fi
else
    print_result 1 "Could not get node for expansion test"
fi
echo ""

# Test 4: Schema Fetching
echo "Test 4: Schema Fetching"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$PROXY_URL/api/neo4j/schema" \
    -H "Content-Type: application/json" \
    -d '{}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    if echo "$BODY" | grep -q "nodeLabels"; then
        print_result 0 "Schema fetching successful"
    else
        print_result 1 "Schema returned 200 but missing nodeLabels"
    fi
else
    print_result 1 "Schema fetching failed with HTTP $HTTP_CODE"
fi
echo ""

# Test 5: Node Statistics
echo "Test 5: Node Statistics"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$PROXY_URL/api/neo4j/statistics/nodes" \
    -H "Content-Type: application/json" \
    -d '{"limit":10,"offset":0}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    if echo "$BODY" | grep -q "statistics"; then
        print_result 0 "Node statistics successful"
    else
        print_result 1 "Node statistics returned 200 but missing statistics"
    fi
else
    print_result 1 "Node statistics failed with HTTP $HTTP_CODE"
fi
echo ""

# Test 6: Relationship Statistics
echo "Test 6: Relationship Statistics"
# Get a node label first
LABEL_RESPONSE=$(curl -s -X POST "$PROXY_URL/api/neo4j/schema" \
    -H "Content-Type: application/json" \
    -d '{}')

if echo "$LABEL_RESPONSE" | grep -q "nodeLabels"; then
    NODE_LABEL=$(echo "$LABEL_RESPONSE" | grep -o '"[A-Z][a-zA-Z]*"' | head -1 | tr -d '"')
    
    if [ -n "$NODE_LABEL" ]; then
        REL_PAYLOAD="{\"nodeLabel\":\"$NODE_LABEL\",\"sampleSize\":100}"
        RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$PROXY_URL/api/neo4j/statistics/relationships" \
            -H "Content-Type: application/json" \
            -d "$REL_PAYLOAD")
        HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
        BODY=$(echo "$RESPONSE" | sed '$d')
        
        if [ "$HTTP_CODE" = "200" ]; then
            if echo "$BODY" | grep -q "statistics"; then
                print_result 0 "Relationship statistics successful"
            else
                print_result 1 "Relationship statistics returned 200 but missing statistics"
            fi
        else
            print_result 1 "Relationship statistics failed with HTTP $HTTP_CODE"
        fi
    else
        print_result 1 "Could not extract node label for relationship statistics"
    fi
else
    print_result 1 "Could not get schema for relationship statistics test"
fi
echo ""

# Test 7: OpenAI Query Generation
echo "Test 7: OpenAI Query Generation"
OPENAI_PAYLOAD='{"query":"Find all diseases","schema":"Disease, Gene, Protein"}'
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$PROXY_URL/api/openai/generate" \
    -H "Content-Type: application/json" \
    -d "$OPENAI_PAYLOAD")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    if echo "$BODY" | grep -q "cypherQuery"; then
        print_result 0 "OpenAI query generation successful"
    else
        print_result 1 "OpenAI returned 200 but missing cypherQuery"
    fi
else
    print_result 1 "OpenAI query generation failed with HTTP $HTTP_CODE"
fi
echo ""

# Test 8: Error Handling - Invalid JSON
echo "Test 8: Error Handling - Invalid JSON"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$PROXY_URL/api/neo4j/query" \
    -H "Content-Type: application/json" \
    -d 'invalid json')
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

if [ "$HTTP_CODE" = "400" ]; then
    print_result 0 "Invalid JSON returns 400 error"
else
    print_result 1 "Invalid JSON should return 400, got HTTP $HTTP_CODE"
fi
echo ""

# Test 9: Error Handling - Missing Required Fields
echo "Test 9: Error Handling - Missing Required Fields"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$PROXY_URL/api/neo4j/query" \
    -H "Content-Type: application/json" \
    -d '{}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

if [ "$HTTP_CODE" = "400" ]; then
    print_result 0 "Missing required fields returns 400 error"
else
    print_result 1 "Missing fields should return 400, got HTTP $HTTP_CODE"
fi
echo ""

# Test 10: Rate Limiting
echo "Test 10: Rate Limiting (sending 150 requests)"
echo -e "${YELLOW}This may take a minute...${NC}"
RATE_LIMIT_EXCEEDED=0

for i in {1..150}; do
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$PROXY_URL/api/neo4j/query" \
        -H "Content-Type: application/json" \
        -d '{"cypher":"RETURN 1","params":{}}')
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    
    if [ "$HTTP_CODE" = "429" ]; then
        RATE_LIMIT_EXCEEDED=1
        break
    fi
done

if [ $RATE_LIMIT_EXCEEDED -eq 1 ]; then
    print_result 0 "Rate limiting triggered after 100 requests"
else
    print_result 1 "Rate limiting did not trigger after 150 requests"
fi
echo ""

# Test 11: Verify Credentials Not Exposed
echo "Test 11: Verify Credentials Not Exposed in Responses"
CREDENTIALS_EXPOSED=0

# Check health endpoint
HEALTH_RESPONSE=$(curl -s "$PROXY_URL/health")
if echo "$HEALTH_RESPONSE" | grep -qi "password\|api.*key\|sk-"; then
    CREDENTIALS_EXPOSED=1
fi

# Check error responses
ERROR_RESPONSE=$(curl -s -X POST "$PROXY_URL/api/neo4j/query" \
    -H "Content-Type: application/json" \
    -d '{}')
if echo "$ERROR_RESPONSE" | grep -qi "password\|api.*key\|sk-"; then
    CREDENTIALS_EXPOSED=1
fi

if [ $CREDENTIALS_EXPOSED -eq 0 ]; then
    print_result 0 "No credentials exposed in responses"
else
    print_result 1 "Credentials found in responses"
fi
echo ""

# Test 12: CORS Headers
echo "Test 12: CORS Headers"
RESPONSE=$(curl -s -I -X OPTIONS "$PROXY_URL/api/neo4j/query" \
    -H "Origin: http://localhost:5173" \
    -H "Access-Control-Request-Method: POST")

if echo "$RESPONSE" | grep -qi "access-control-allow-origin"; then
    print_result 0 "CORS headers present"
else
    print_result 1 "CORS headers missing"
fi
echo ""

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
fi
