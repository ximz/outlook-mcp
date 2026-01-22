# Multi-arch Dockerfile for Outlook MCP Server
# Supports: linux/amd64, linux/arm64

FROM node:20-alpine

# Set working directory
WORKDIR /app

# Create .msgraph directory for token storage mount point
RUN mkdir -p /app/.msgraph

# Set HOME to /app so token path resolves to /app/.msgraph/.outlook-mcp-tokens.json
ENV HOME=/app

# Copy package files first for better layer caching
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy application code
COPY . .

# Copy and make entrypoint executable
COPY docker-entrypoint.sh /app/
RUN chmod +x /app/docker-entrypoint.sh

# Expose port for OAuth auth server
EXPOSE 3333

# Run both auth server (background) and MCP server (foreground)
# MCP uses stdio transport - run with -i flag
# Auth server listens on port 3333 for OAuth callbacks
CMD ["/app/docker-entrypoint.sh"]
