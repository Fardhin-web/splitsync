# Use official Node LTS image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy root, server, and client package files
COPY package.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install server and client dependencies
RUN npm --prefix server install --omit=dev
RUN npm --prefix client install

# Copy source files
COPY server ./server
COPY client ./client

# Build client production SPA
RUN npm --prefix client run build

# Set environment
ENV NODE_ENV=production
ENV PORT=5000

# Expose server port
EXPOSE 5000

# Start server (which serves API + static client SPA)
CMD ["node", "server/src/index.js"]

