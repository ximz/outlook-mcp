#!/bin/sh
# Docker entrypoint script for Outlook MCP
# Runs both the OAuth auth server and MCP server

# Handle shutdown gracefully
cleanup() {
    echo "Shutting down servers..."
    # Kill the auth server if running
    if [ -n "$AUTH_PID" ]; then
        kill $AUTH_PID 2>/dev/null
    fi
    exit 0
}

# Trap SIGTERM and SIGINT
trap cleanup SIGTERM SIGINT

# Start the auth server in the background
echo "Starting OAuth auth server on port 3333..."
node outlook-auth-server.js &
AUTH_PID=$!

# Give auth server a moment to start
sleep 1

echo "Auth server running (PID: $AUTH_PID)"
echo "Visit http://localhost:3333/auth to authenticate"
echo ""
echo "Starting MCP server..."

# Run MCP server in foreground (for stdio communication)
node index.js

# If MCP server exits, clean up
cleanup
