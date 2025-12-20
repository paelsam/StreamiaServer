# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy shared package first
COPY shared/package.json ./shared/
COPY shared/tsconfig.json ./shared/
COPY shared/src ./shared/src

# Copy comment-service package
COPY services/comment-service/package.json ./services/comment-service/

# Install shared dependencies and build
WORKDIR /app/shared
RUN npm install && npm run build

# Install comment-service dependencies
WORKDIR /app/services/comment-service
RUN npm install

# Copy comment-service source code
COPY services/comment-service/tsconfig.json ./
COPY services/comment-service/src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy shared package
COPY --from=builder /app/shared/package.json ./shared/
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/shared/node_modules ./shared/node_modules

# Copy comment-service package
COPY services/comment-service/package.json ./services/comment-service/

# Install production dependencies
WORKDIR /app/services/comment-service
RUN npm install --production

# Copy built application from builder
COPY --from=builder /app/services/comment-service/dist ./dist

# Set working directory
WORKDIR /app/services/comment-service

# Expose port
EXPOSE 3005

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3005/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["npm", "start"]
