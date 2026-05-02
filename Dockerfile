# Stage 1: Build the React Frontend
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source and build
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Stage 2: Setup the Express Backend
FROM node:20-slim

WORKDIR /app

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm install --only=production --legacy-peer-deps && \
    npm install -g tsx

# Copy the built frontend from Stage 1
COPY --from=builder /app/dist ./dist

# Copy the server code
COPY server ./server

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose the port
EXPOSE 5000

# Start the application
CMD ["tsx", "server/index.ts"]
