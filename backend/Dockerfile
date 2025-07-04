// ===== backend/Dockerfile =====
FROM node:18-alpine

# Install dependencies for circuit compilation
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    bash

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Setup ZKP circuits
RUN cd src/zkp/circuits && bash setup.sh

# Create necessary directories
RUN mkdir -p certificates uploads

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

# Start server
CMD ["node", "server.js"]