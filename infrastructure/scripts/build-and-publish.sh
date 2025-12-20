#!/usr/bin/env bash
set -euo pipefail

# Build and push Docker images for gateway, movie-service and user-service
# Defaults:
#   DOCKER_USERNAME -> andresmg42
#   DOCKER_PASSWORD -> (optional) if provided, will login non-interactively
#   TAG -> latest

DOCKER_USERNAME="${DOCKER_USERNAME:-andresmg42}"
TAG="${TAG:-latest}"
BUILD_ARGS="${BUILD_ARGS:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

GATEWAY_DOCKERFILE="$REPO_ROOT/gateway/express-gateway/Dockerfile"
MOVIE_DOCKERFILE="$REPO_ROOT/services/movie-service/Dockerfile"
USER_DOCKERFILE="$REPO_ROOT/services/user-service/Dockerfile"
RATING_DOCKERFILE="$REPO_ROOT/services/rating-service/Dockerfile"
NOTIFICATION_DOCKERFILE="$REPO_ROOT/services/notification-service/Dockerfile"
COMMENT_DIR="$REPO_ROOT/../services/comment-service"
FAVORITES_DOCKERFILE="$REPO_ROOT/services/favorites-service/Dockerfile"

GATEWAY_REPO="$DOCKER_USERNAME/gateway"
MOVIE_REPO="$DOCKER_USERNAME/movie-service"
USER_REPO="$DOCKER_USERNAME/user-service"
RATING_REPO="$DOCKER_USERNAME/streamia-rating-service"
NOTIFICATION_REPO="$DOCKER_USERNAME/streamia-notification-service"
COMMENT_REPO="$DOCKER_USERNAME/comment-service"
FAVORITES_REPO="$DOCKER_USERNAME/streamia-favorites-service"

function ensure_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "docker CLI not found. Install Docker and retry." >&2
    exit 1
  fi
}

function docker_login_if_needed() {
  if [ -n "${DOCKER_PASSWORD:-}" ]; then
    echo "Logging into Docker Hub as $DOCKER_USERNAME"
    echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin
  else
    echo "No DOCKER_PASSWORD provided; assuming you're already logged in or will login interactively."
  fi
}

function build_and_push() {
  local dockerfile="$1" repo="$2"
  if [ ! -f "$dockerfile" ]; then
    echo "Dockerfile not found: $dockerfile" >&2
    exit 1
  fi
  echo "\n==> Building $repo:$TAG from $dockerfile"
  docker build -t "$repo:$TAG" -f "$dockerfile" $BUILD_ARGS "$REPO_ROOT"
  echo "Pushing $repo:$TAG"
  docker push "$repo:$TAG"
}

ensure_docker
docker_login_if_needed

build_and_push "$GATEWAY_DOCKERFILE" "$GATEWAY_REPO"
build_and_push "$MOVIE_DOCKERFILE" "$MOVIE_REPO"
build_and_push "$USER_DOCKERFILE" "$USER_REPO"
build_and_push "$RATING_DOCKERFILE" "$RATING_REPO"
build_and_push "$NOTIFICATION_DOCKERFILE" "$NOTIFICATION_REPO"
build_and_push "$COMMENT_DIR" "$COMMENT_REPO"
build_and_push "$FAVORITES_DOCKERFILE" "$FAVORITES_REPO"

echo "\nAll images built and pushed as $DOCKER_USERNAME/*:$TAG"

cat <<'USAGE' >&2
Usage examples:

# Provide credentials via env vars (non-interactive):
# DOCKER_USERNAME=andresmg42 DOCKER_PASSWORD=your_password TAG=v1.0 ./infrastructure/scripts/build-and-publish.sh

# Or login interactively beforehand and run:
# docker login
# TAG=v1.0 ./infrastructure/scripts/build-and-publish.sh

You can override repo names or build args by editing the script or exporting BUILD_ARGS.
USAGE