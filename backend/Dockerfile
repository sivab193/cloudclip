# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

# Reproducible install including devDependencies for the TS build
RUN npm ci

COPY . .

RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled JS from builder
COPY --from=builder /app/dist ./dist

USER node

EXPOSE 3000

CMD ["node", "dist/index.js"]
