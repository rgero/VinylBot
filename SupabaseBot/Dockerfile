# Use official Node.js LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install dependencies
# Using 'npm ci' is generally better for production/automated builds
RUN npm install

# Copy the rest of the application code
# This includes src, service-account.json, and discordMapping.json
COPY . .

# Build the application (if your project requires a build step)
RUN npm run build

# Use CMD to start the application when the container launches
# This replaces the 'RUN npm start'
CMD ["npm", "start"]