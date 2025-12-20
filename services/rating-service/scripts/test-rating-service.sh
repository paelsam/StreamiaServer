#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3004}"
USER_ID="test-user-1"
MOVIE_ID="test-movie-1"

echo "🚀 Testing Rating Service at $BASE_URL"
echo "--------------------------------------"

echo "🩺 Health check..."
curl -sf "$BASE_URL/health/live" >/dev/null || {
  echo "❌ Health live failed"
  exit 1
}
curl -sf "$BASE_URL/health/ready" >/dev/null || {
  echo "❌ Health ready failed"
  exit 1
}
echo "✅ Health checks passed"

echo "⭐ Creating rating..."
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/ratings/$MOVIE_ID" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d '{"score":4}')

echo "$CREATE_RESPONSE" | grep -q '"score":4' || {
  echo "❌ Rating creation failed"
  exit 1
}
echo "✅ Rating created"

echo "✏️ Updating rating..."
UPDATE_RESPONSE=$(curl -s -X POST "$BASE_URL/ratings/$MOVIE_ID" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d '{"score":5}')

echo "$UPDATE_RESPONSE" | grep -q '"score":5' || {
  echo "❌ Rating update failed"
  exit 1
}
echo "✅ Rating updated"

echo "📊 Fetching movie stats..."
STATS=$(curl -s "$BASE_URL/ratings/movie/$MOVIE_ID/stats")

echo "$STATS" | grep -q '"average":5' || {
  echo "❌ Stats calculation failed"
  exit 1
}
echo "✅ Stats correct"

echo "🗑 Deleting rating..."
curl -s -X DELETE "$BASE_URL/ratings/$MOVIE_ID" \
  -H "x-user-id: $USER_ID" >/dev/null

echo "🔍 Verifying stats reset..."
STATS_AFTER=$(curl -s "$BASE_URL/ratings/movie/$MOVIE_ID/stats")

echo "$STATS_AFTER" | grep -q '"total":0' || {
  echo "❌ Rating was not deleted properly"
  exit 1
}
echo "✅ Rating deleted and stats reset"

echo
echo "🎉 ALL RATING SERVICE TESTS PASSED"