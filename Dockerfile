# Step 1: Build Stage
FROM node:20 AS build

WORKDIR /usr/src/app

# Copy dependencies
COPY package*.json ./
COPY prisma ./prisma

# Install all dependencies
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

# Add glibc compatibility for Prisma query engine
RUN apk add --no-cache libc6-compat

# Copy built application and dependencies
COPY --from=build /usr/src/app /usr/src/app

# Ensure non-root user permissions
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /usr/src/app

USER appuser

EXPOSE 8080

# Run migrations and start the application
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
