# STEP 1: Dependencies Stage
FROM node:24-alpine AS deps
WORKDIR /usr/src/app

# Install build dependencies if native modules need compilation
RUN apk add --no-cache libc6-compat

# Copy lock files first to maximize Docker layer caching
COPY package.json package-lock.json* ./

# Clean install all dependencies (including devDependencies)
RUN npm ci

# STEP 2: Build Stage
FROM node:24-alpine AS builder
WORKDIR /usr/src/app

# Reuse installed dependencies from deps stage
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY package.json ./
COPY tsconfig.json* ./
COPY src ./src

# Compile TypeScript
RUN npm run build

# STEP 3: Production Runner Stage
FROM node:24-alpine AS runner
WORKDIR /usr/src/app

# Set production environment
ENV NODE_ENV=production

# Copy package manifests and install ONLY production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built artifacts and configuration files
COPY --from=builder /usr/src/app/dist ./dist
COPY discordMapping.json ./
COPY service-account.json ./

# Run as non-root user for security
USER node

CMD ["node", "dist/index.js"]