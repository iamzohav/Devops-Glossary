FROM node:18-alpine

WORKDIR /app

# Copy package files first for layer caching
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy all other files
COPY . .

# Environment variables
ENV AWS_REGION=ap-south-2 \
    NODE_ENV=production

# Expose port and run
EXPOSE 3000
CMD ["node", "server.js"]
