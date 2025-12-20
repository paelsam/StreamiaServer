#!/bin/bash

# Test script for Favorites Service
# This script tests the favorites service endpoints

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

BASE_URL="${BASE_URL:-http://localhost:3003}"
TOKEN="${TOKEN:-}"

echo -e "${GREEN}Testing Favorites Service at $BASE_URL${NC}\n"

# Test 1: Health Check (Public)
echo -e "${YELLOW}Test 1: Health Check${NC}"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/health")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
  echo -e "${GREEN}✓ Health check passed${NC}"
  echo "Response: $body"
else
  echo -e "${RED}✗ Health check failed (HTTP $http_code)${NC}"
  echo "Response: $body"
fi

echo ""

# Test 2: Liveness Check
echo -e "${YELLOW}Test 2: Liveness Check${NC}"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/health/live")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
  echo -e "${GREEN}✓ Liveness check passed${NC}"
  echo "Response: $body"
else
  echo -e "${RED}✗ Liveness check failed (HTTP $http_code)${NC}"
  echo "Response: $body"
fi

echo ""

# Test 3: Readiness Check
echo -e "${YELLOW}Test 3: Readiness Check${NC}"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/health/ready")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
  echo -e "${GREEN}✓ Readiness check passed - Service is ready${NC}"
  echo "Response: $body"
elif [ "$http_code" = "503" ]; then
  echo -e "${YELLOW}⚠ Service not ready (dependencies not available)${NC}"
  echo "Response: $body"
else
  echo -e "${RED}✗ Readiness check failed (HTTP $http_code)${NC}"
  echo "Response: $body"
fi

echo ""

# Test 4: Root endpoint
echo -e "${YELLOW}Test 4: Root Endpoint${NC}"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
  echo -e "${GREEN}✓ Root endpoint accessible${NC}"
  echo "Response: $body"
else
  echo -e "${RED}✗ Root endpoint failed (HTTP $http_code)${NC}"
  echo "Response: $body"
fi

echo ""

# Test 5: API Health endpoint
echo -e "${YELLOW}Test 5: API Health Endpoint${NC}"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/favorites/health")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
  echo -e "${GREEN}✓ API health endpoint accessible${NC}"
  echo "Response: $body"
else
  echo -e "${RED}✗ API health endpoint failed (HTTP $http_code)${NC}"
  echo "Response: $body"
fi

echo ""

# Test 6: Protected endpoints (requires auth)
if [ -n "$TOKEN" ]; then
  echo -e "${YELLOW}Test 6: Get User Favorites (Protected)${NC}"
  response=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/api/favorites")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ Get favorites successful${NC}"
    echo "Response: $body"
  else
    echo -e "${RED}✗ Get favorites failed (HTTP $http_code)${NC}"
    echo "Response: $body"
  fi
else
  echo -e "${YELLOW}⚠ Skipping protected endpoint tests (no TOKEN provided)${NC}"
  echo "To test protected endpoints, set TOKEN environment variable:"
  echo "  export TOKEN='your-jwt-token'"
  echo "  ./test-favorites-service.sh"
fi

echo ""
echo -e "${GREEN}===================================${NC}"
echo -e "${GREEN}Favorites Service Tests Complete${NC}"
echo -e "${GREEN}===================================${NC}"
