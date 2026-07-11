# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for TS build)
RUN npm install

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build || npx tsc

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled JS from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Start command
CMD ["node", "dist/index.js"]
