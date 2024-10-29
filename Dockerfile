# Step 1: Build Stage
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
COPY . .

# Generate Prisma Client
RUN npx prisma generate

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
