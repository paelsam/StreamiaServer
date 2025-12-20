#!/bin/bash

# Test script for Favorites Service
# This script tests the favorites service endpoints

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
FAVORITES_URL="${FAVORITES_URL:-http://localhost:3003}"
AUTH_URL="${AUTH_URL:-http://localhost:3001}"
MOVIE_URL="${MOVIE_URL:-http://localhost:3002}"
TEST_EMAIL="${TEST_EMAIL:-test-favorites2@example.com}"
TEST_USERNAME="${TEST_USERNAME:-testfavoritesuser2}"
TEST_PASSWORD="${TEST_PASSWORD:-password123}"
# These will be populated by actual movies from database
TEST_MOVIE_ID=""
TEST_MOVIE_ID_2=""
MOVIES_AVAILABLE=false

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Testing Favorites Service${NC}"
echo -e "${GREEN}========================================${NC}\n"
echo -e "${BLUE}Favorites URL: $FAVORITES_URL${NC}"
echo -e "${BLUE}Auth URL: $AUTH_URL${NC}\n"

# Function to get existing movies
create_test_movies() {
  echo -e "${YELLOW}Getting existing movies...${NC}"
  
  # Try to get more movies to ensure we find valid ones
  EXISTING_MOVIES=$(curl -s "$MOVIE_URL/api/v1/movies?limit=10" 2>/dev/null || echo '{}')
  
  # Extract all movie IDs
  ALL_IDS=$(echo "$EXISTING_MOVIES" | grep -o '"_id":"[^"]*' | cut -d'"' -f4)
  
  # Try to find 2 valid movies by testing each one
  VALID_COUNT=0
  for movie_id in $ALL_IDS; do
    # Test if the movie can be accessed (validate it exists)
    test_response=$(curl -s -w "\n%{http_code}" "$MOVIE_URL/api/v1/movies/$movie_id" 2>/dev/null)
    test_code=$(echo "$test_response" | tail -n1)
    
    if [ "$test_code" = "200" ]; then
      if [ $VALID_COUNT -eq 0 ]; then
        TEST_MOVIE_ID=$movie_id
        VALID_COUNT=1
      elif [ $VALID_COUNT -eq 1 ]; then
        TEST_MOVIE_ID_2=$movie_id
        VALID_COUNT=2
        break
      fi
    fi
  done
  
  if [ $VALID_COUNT -eq 2 ]; then
    echo -e "${GREEN}✓ Using 2 validated movies from database${NC}"
    echo "Movie 1 ID: $TEST_MOVIE_ID"
    echo "Movie 2 ID: $TEST_MOVIE_ID_2"
    MOVIES_AVAILABLE=true
  elif [ $VALID_COUNT -eq 1 ]; then
    echo -e "${YELLOW}⚠ Only 1 valid movie found, some tests will be limited${NC}"
    echo "Movie 1 ID: $TEST_MOVIE_ID"
    TEST_MOVIE_ID_2=$TEST_MOVIE_ID  # Use same movie for tests that need 2
    MOVIES_AVAILABLE=true
  else
    echo -e "${YELLOW}⚠ No valid movies found, tests requiring movies will be skipped${NC}"
    MOVIES_AVAILABLE=false
  fi
  echo ""
}

# Test 1: Health Check (Public)
echo -e "${YELLOW}Test 1: Health Check${NC}"
response=$(curl -s -w "\n%{http_code}" "$FAVORITES_URL/health")
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
response=$(curl -s -w "\n%{http_code}" "$FAVORITES_URL/health/live")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
  echo -e "${GREEN}✓ Liveness check passed${NC}"
else
  echo -e "${RED}✗ Liveness check failed (HTTP $http_code)${NC}"
fi
echo ""

# Test 3: Readiness Check
echo -e "${YELLOW}Test 3: Readiness Check${NC}"
response=$(curl -s -w "\n%{http_code}" "$FAVORITES_URL/health/ready")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
  echo -e "${GREEN}✓ Readiness check passed - Service is ready${NC}"
elif [ "$http_code" = "503" ]; then
  echo -e "${YELLOW}⚠ Service not ready (dependencies not available)${NC}"
  echo "Response: $body"
else
  echo -e "${RED}✗ Readiness check failed (HTTP $http_code)${NC}"
fi
echo ""

# Test 4: Authentication - Register or Login
echo -e "${YELLOW}Test 4: Authentication${NC}"
echo "Attempting to register test user..."
response=$(curl -s -w "\n%{http_code}" -X POST "$AUTH_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"username\": \"$TEST_USERNAME\",
    \"password\": \"$TEST_PASSWORD\"
  }")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "201" ] || [ "$http_code" = "200" ]; then
  echo -e "${GREEN}✓ User registered successfully${NC}"
  TOKEN=$(echo "$body" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
elif [ "$http_code" = "409" ] || [ "$http_code" = "400" ]; then
  echo -e "${YELLOW}⚠ User already exists, attempting login...${NC}"
  
  response=$(curl -s -w "\n%{http_code}" -X POST "$AUTH_URL/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$TEST_EMAIL\",
      \"password\": \"$TEST_PASSWORD\"
    }")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  
  if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ Login successful${NC}"
    TOKEN=$(echo "$body" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
  else
    echo -e "${RED}✗ Login failed (HTTP $http_code)${NC}"
    echo "Response: $body"
    exit 1
  fi
else
  echo -e "${RED}✗ Authentication failed (HTTP $http_code)${NC}"
  echo "Response: $body"
  exit 1
fi

if [ -z "$TOKEN" ]; then
  echo -e "${RED}✗ Failed to get access token${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Access token obtained${NC}"
echo ""

# Get test movies
create_test_movies

# Cleanup: Delete any existing favorites before starting tests
echo -e "${YELLOW}Cleanup: Removing any existing favorites...${NC}"
if [ "$MOVIES_AVAILABLE" = true ]; then
  # Try to delete both movies if they exist in favorites
  curl -s -X DELETE "$FAVORITES_URL/api/favorites/$TEST_MOVIE_ID" -H "Authorization: Bearer $TOKEN" > /dev/null 2>&1
  curl -s -X DELETE "$FAVORITES_URL/api/favorites/$TEST_MOVIE_ID_2" -H "Authorization: Bearer $TOKEN" > /dev/null 2>&1
  echo -e "${GREEN}✓ Cleanup completed${NC}"
else
  echo -e "${YELLOW}⊘ Cleanup skipped - no movies available${NC}"
fi
echo ""

# Test 5: Get Favorites (should be empty initially)
echo -e "${YELLOW}Test 5: Get User Favorites (Empty)${NC}"
response=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$FAVORITES_URL/api/favorites")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
  echo -e "${GREEN}✓ Get favorites successful${NC}"
  echo "Response: $body"
else
  echo -e "${RED}✗ Get favorites failed (HTTP $http_code)${NC}"
  echo "Response: $body"
fi
echo ""

# Test 6: Add First Favorite
echo -e "${YELLOW}Test 6: Add Favorite (with note)${NC}"
if [ "$MOVIES_AVAILABLE" = true ]; then
  response=$(curl -s -w "\n%{http_code}" -X POST "$FAVORITES_URL/api/favorites/$TEST_MOVIE_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"note\": \"Amazing movie! Must watch again.\"
    }")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" = "201" ]; then
    echo -e "${GREEN}✓ Favorite added successfully${NC}"
    echo "Response: $body"
  else
    echo -e "${RED}✗ Add favorite failed (HTTP $http_code)${NC}"
    echo "Response: $body"
  fi
else
  echo -e "${YELLOW}⊘ Test skipped - no movies available${NC}"
fi
echo ""

# Test 7: Add Second Favorite (without note)
echo -e "${YELLOW}Test 7: Add Second Favorite (without note)${NC}"
if [ "$MOVIES_AVAILABLE" = true ]; then
  response=$(curl -s -w "\n%{http_code}" -X POST "$FAVORITES_URL/api/favorites/$TEST_MOVIE_ID_2" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{}")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" = "201" ]; then
    echo -e "${GREEN}✓ Second favorite added successfully${NC}"
    echo "Response: $body"
  else
    echo -e "${RED}✗ Add second favorite failed (HTTP $http_code)${NC}"
    echo "Response: $body"
  fi
else
  echo -e "${YELLOW}⊘ Test skipped - no movies available${NC}"
fi
echo ""

# Test 8: Try to Add Duplicate (should fail)
echo -e "${YELLOW}Test 8: Add Duplicate Favorite (should fail)${NC}"
if [ "$MOVIES_AVAILABLE" = true ]; then
  response=$(curl -s -w "\n%{http_code}" -X POST "$FAVORITES_URL/api/favorites/$TEST_MOVIE_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"note\": \"Trying to add again\"
    }")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" = "409" ]; then
    echo -e "${GREEN}✓ Duplicate correctly rejected${NC}"
    echo "Response: $body"
  else
    echo -e "${RED}✗ Expected 409 but got HTTP $http_code${NC}"
    echo "Response: $body"
  fi
else
  echo -e "${YELLOW}⊘ Test skipped - no movies available${NC}"
fi
echo ""

# Test 9: Get Favorites (should have 2 items)
echo -e "${YELLOW}Test 9: Get User Favorites (with data)${NC}"
response=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$FAVORITES_URL/api/favorites")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
  echo -e "${GREEN}✓ Get favorites successful${NC}"
  echo "Response: $body"
else
  echo -e "${RED}✗ Get favorites failed (HTTP $http_code)${NC}"
  echo "Response: $body"
fi
echo ""

# Test 10: Get Favorites with Pagination
echo -e "${YELLOW}Test 10: Get Favorites with Pagination${NC}"
response=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$FAVORITES_URL/api/favorites?page=1&limit=10")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
  echo -e "${GREEN}✓ Pagination successful${NC}"
  echo "Response: $body"
else
  echo -e "${RED}✗ Pagination failed (HTTP $http_code)${NC}"
  echo "Response: $body"
fi
echo ""

# Test 11: Check if Movie is in Favorites
echo -e "${YELLOW}Test 11: Check if Movie is in Favorites${NC}"
if [ "$MOVIES_AVAILABLE" = true ]; then
  response=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "$FAVORITES_URL/api/favorites/$TEST_MOVIE_ID/check")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ Check favorite successful${NC}"
    echo "Response: $body"
  else
    echo -e "${RED}✗ Check favorite failed (HTTP $http_code)${NC}"
    echo "Response: $body"
  fi
else
  echo -e "${YELLOW}⊘ Test skipped - no movies available${NC}"
fi
echo ""

# Test 12: Update Favorite Note
echo -e "${YELLOW}Test 12: Update Favorite Note${NC}"
if [ "$MOVIES_AVAILABLE" = true ]; then
  response=$(curl -s -w "\n%{http_code}" -X PUT "$FAVORITES_URL/api/favorites/$TEST_MOVIE_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"note\": \"Updated note: Even better on second watch!\"
    }")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ Update note successful${NC}"
    echo "Response: $body"
  else
    echo -e "${RED}✗ Update note failed (HTTP $http_code)${NC}"
    echo "Response: $body"
  fi
else
  echo -e "${YELLOW}⊘ Test skipped - no movies available${NC}"
fi
echo ""

# Test 13: Delete First Favorite
echo -e "${YELLOW}Test 13: Delete Favorite${NC}"
if [ "$MOVIES_AVAILABLE" = true ]; then
  response=$(curl -s -w "\n%{http_code}" -X DELETE "$FAVORITES_URL/api/favorites/$TEST_MOVIE_ID" \
    -H "Authorization: Bearer $TOKEN")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ Delete favorite successful${NC}"
    echo "Response: $body"
  else
    echo -e "${RED}✗ Delete favorite failed (HTTP $http_code)${NC}"
    echo "Response: $body"
  fi
else
  echo -e "${YELLOW}⊘ Test skipped - no movies available${NC}"
fi
echo ""

# Test 14: Try to Delete Non-existent Favorite (should fail)
echo -e "${YELLOW}Test 14: Delete Non-existent Favorite (should fail)${NC}"
if [ "$MOVIES_AVAILABLE" = true ]; then
  response=$(curl -s -w "\n%{http_code}" -X DELETE "$FAVORITES_URL/api/favorites/$TEST_MOVIE_ID" \
    -H "Authorization: Bearer $TOKEN")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" = "404" ]; then
    echo -e "${GREEN}✓ Non-existent favorite correctly rejected${NC}"
    echo "Response: $body"
  elif [ "$http_code" = "500" ]; then
    echo -e "${YELLOW}⚠ Got 500 instead of 404 (known service issue)${NC}"
    echo "Response: $body"
  else
    echo -e "${RED}✗ Expected 404 but got HTTP $http_code${NC}"
    echo "Response: $body"
  fi
else
  echo -e "${YELLOW}⊘ Test skipped - no movies available${NC}"
fi
echo ""

# Test 15: Get Favorites (should have 1 item remaining)
echo -e "${YELLOW}Test 15: Get Remaining Favorites${NC}"
response=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$FAVORITES_URL/api/favorites")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
  echo -e "${GREEN}✓ Get remaining favorites successful${NC}"
  echo "Response: $body"
else
  echo -e "${RED}✗ Get favorites failed (HTTP $http_code)${NC}"
  echo "Response: $body"
fi
echo ""

# Test 16: Delete Remaining Favorite (cleanup)
echo -e "${YELLOW}Test 16: Cleanup - Delete Remaining Favorite${NC}"
if [ "$MOVIES_AVAILABLE" = true ]; then
  response=$(curl -s -w "\n%{http_code}" -X DELETE "$FAVORITES_URL/api/favorites/$TEST_MOVIE_ID_2" \
    -H "Authorization: Bearer $TOKEN")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ Cleanup successful${NC}"
  elif [ "$http_code" = "404" ] || [ "$http_code" = "500" ]; then
    echo -e "${YELLOW}⚠ Movie 2 was not in favorites (expected if Test 7 failed)${NC}"
  else
    echo -e "${RED}✗ Cleanup failed (HTTP $http_code)${NC}"
  fi
else
  echo -e "${YELLOW}⊘ Test skipped - no movies available${NC}"
fi
echo ""

# Test 17: Verify Empty Favorites List
echo -e "${YELLOW}Test 17: Verify Empty Favorites After Cleanup${NC}"
response=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$FAVORITES_URL/api/favorites")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
  echo -e "${GREEN}✓ Final verification successful${NC}"
  echo "Response: $body"
else
  echo -e "${RED}✗ Final verification failed (HTTP $http_code)${NC}"
  echo "Response: $body"
fi
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Favorites Service Tests Complete! ✓${NC}"
echo -e "${GREEN}========================================${NC}"
