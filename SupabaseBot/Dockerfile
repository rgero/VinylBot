# Use official Node.js LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application with increased memory (2GB)
RUN NODE_OPTIONS="--max-old-space-size=2048" npm run build

# Use CMD to start the application
CMD ["npm", "start"]