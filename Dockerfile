# Step 1: Build Stage
FROM node:20 AS build

WORKDIR /usr/src/app

# Copy dependencies
COPY package*.json ./
COPY prisma ./prisma

# Install all dependencies (including dev dependencies)
RUN npm install

# Copy application code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the application
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Step 2: Production Stage
FROM node:20-alpine AS production

WORKDIR /usr/src/app

# Copy built application and production dependencies
COPY --from=build /usr/src/app /usr/src/app

# Set Prisma writable directory
ENV PRISMA_QUERY_ENGINE_LIBRARY=/tmp/prisma
RUN mkdir -p /tmp/prisma && chmod -R 777 /tmp/prisma

# Ensure non-root user permissions
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /usr/src/app

USER appuser

EXPOSE 8080

# Run database migrations and start the application
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
