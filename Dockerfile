# Step 1: Build Stage
FROM node:16 AS build

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Copy the Prisma schema to the container
COPY prisma ./prisma

# Install all dependencies (including dev dependencies)
RUN npm install

# Copy the rest of the application code to the container
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the application
RUN npm run build

# Remove dev dependencies after building
RUN npm prune --production

# Step 2: Production Stage
FROM node:16-alpine AS production

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy the built application and production node_modules from the build stage
COPY --from=build /usr/src/app /usr/src/app

# Fix permissions for node_modules (recursive)
RUN chown -R node:node /usr/src/app/node_modules

# Ensure permissions are set for non-root users
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Expose the port the app runs on
EXPOSE 8080

# Run database migrations and start the application in one command
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
