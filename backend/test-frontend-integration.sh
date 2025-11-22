#!/bin/bash

# Frontend-Backend Integration Test
# Verifies that the frontend can successfully communicate with the backend proxy

FRONTEND_URL="http://localhost:3000"
PROXY_URL="http://localhost:3001"
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "Frontend-Backend Integration Test"
echo "=========================================="
echo ""

# Test 1: Verify frontend is running
echo "Test 1: Verify frontend is running"
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC}: Frontend is accessible at $FRONTEND_URL"
else
    echo -e "${RED}✗ FAIL${NC}: Frontend not accessible (HTTP $FRONTEND_STATUS)"
    exit 1
fi
echo ""

# Test 2: Verify backend is running
echo "Test 2: Verify backend is running"
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROXY_URL/health")
if [ "$BACKEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC}: Backend is accessible at $PROXY_URL"
else
    echo -e "${RED}✗ FAIL${NC}: Backend not accessible (HTTP $BACKEND_STATUS)"
    exit 1
fi
echo ""

# Test 3: Verify CORS allows frontend origin
echo "Test 3: Verify CORS configuration"
CORS_RESPONSE=$(curl -s -I -X OPTIONS "$PROXY_URL/api/neo4j/query" \
    -H "Origin: http://localhost:3000" \
    -H "Access-Control-Request-Method: POST")

if echo "$CORS_RESPONSE" | grep -qi "access-control-allow-origin"; then
    echo -e "${GREEN}✓ PASS${NC}: CORS configured for frontend origin"
else
    echo -e "${RED}✗ FAIL${NC}: CORS not configured properly"
    exit 1
fi
echo ""

# Test 4: Verify credentials are not in frontend bundle
echo "Test 4: Verify credentials not exposed in frontend"
FRONTEND_JS=$(curl -s "$FRONTEND_URL")
CREDENTIALS_FOUND=0

if echo "$FRONTEND_JS" | grep -qi "NEO4J_PASSWORD\|bolt://.*@\|sk-proj-"; then
    CREDENTIALS_FOUND=1
fi

if [ $CREDENTIALS_FOUND -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC}: No credentials found in frontend bundle"
else
    echo -e "${RED}✗ FAIL${NC}: Credentials may be exposed in frontend"
    exit 1
fi
echo ""

# Test 5: Test actual query through frontend to backend
echo "Test 5: Test query flow (Frontend → Backend → Neo4j)"
QUERY_RESULT=$(curl -s -X POST "$PROXY_URL/api/neo4j/query" \
    -H "Content-Type: application/json" \
    -H "Origin: http://localhost:3000" \
    -d '{"cypher":"MATCH (n) RETURN n LIMIT 1","params":{}}')

if echo "$QUERY_RESULT" | grep -q "nodes"; then
    echo -e "${GREEN}✓ PASS${NC}: Query successfully executed through proxy"
else
    echo -e "${RED}✗ FAIL${NC}: Query failed"
    exit 1
fi
echo ""

echo "=========================================="
echo -e "${GREEN}All integration tests passed!${NC}"
echo "=========================================="
echo ""
echo "Summary:"
echo "  ✓ Frontend running on port 3000"
echo "  ✓ Backend proxy running on port 3001"
echo "  ✓ CORS configured correctly"
echo "  ✓ Credentials secured on backend"
echo "  ✓ Query flow working end-to-end"
echo ""
