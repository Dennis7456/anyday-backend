# Step 1: Build Stage
<<<<<<< HEAD
FROM node:20 AS build

WORKDIR /usr/src/app

# Copy dependencies
COPY package*.json ./
COPY prisma ./prisma

# Install all dependencies
RUN npm install

# Copy application code
=======
FROM node:16 AS build

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock) to the container
COPY package*.json ./

# Copy the prisma schema to the container
COPY prisma ./prisma

# Install all dependencies (including dev dependencies)
RUN npm install

# Copy the rest of the application code to the container
>>>>>>> e7c503d741dbc5a1650205c775bff16f09a89214
COPY . .

# Generate Prisma Client
RUN npx prisma generate

<<<<<<< HEAD
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
=======
# Remove dev dependencies after generating Prisma client
RUN npm prune --production

# Build the application if there's a build step (e.g., for TypeScript or Webpack)
RUN npm run build
# RUN npx tsc

# Step 2: Production Stage
FROM node:16-alpine AS production

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy built application and node_modules from the build stage
COPY --from=build /usr/src/app /usr/src/app

# Expose the port the app runs on
EXPOSE 8080

# Run database migrations and start the application in one command
ENTRYPOINT ["sh", "-c", "npx prisma migrate deploy && npm start"]
>>>>>>> e7c503d741dbc5a1650205c775bff16f09a89214
