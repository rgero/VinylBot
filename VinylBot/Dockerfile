# STEP 1: Dependencies Stage
FROM node:24-alpine AS deps
WORKDIR /usr/src/app

# Install native compilation dependencies if needed
RUN apk add --no-cache libc6-compat

# Copy package files first to maximize Docker caching layer
COPY package.json package-lock.json* ./

# Clean install ALL dependencies (including devDependencies) using BuildKit caching
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# STEP 2: Build Stage
FROM node:24-alpine AS builder
WORKDIR /usr/src/app

# Copy dependencies and source code
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY package.json tsconfig.json* ./
COPY src ./src

# Build TypeScript output
RUN npm run build

# Remove devDependencies to prepare lightweight production node_modules
RUN npm prune --production

# STEP 3: Production Runner Stage
FROM node:24-alpine AS runner
WORKDIR /usr/src/app

# Install tini for proper process signal handling (PID 1)
RUN apk add --no-cache tini

ENV NODE_ENV=production

# Copy pruned node_modules and built artifacts directly with correct user ownership
COPY --chown=node:node package.json ./
COPY --chown=node:node --from=deps /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=builder /usr/src/app/dist ./dist
COPY --chown=node:node discordMapping.json ./

# NOTE: Removed service-account.json. Provide credentials dynamically at runtime!

# Run as non-root user for security
USER node

# Default entrypoint using tini to ensure SIGTERM signals reach Node
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]