/**
 * Authentication module for Outlook MCP server
 */
const TokenStorage = require('./token-storage');
const { authTools } = require('./tools');

// Create a singleton TokenStorage instance
const tokenStorage = new TokenStorage();

/**
 * Ensures the user is authenticated and returns an access token
 * Uses TokenStorage for automatic token refresh
 * @param {boolean} forceNew - Whether to force a new authentication
 * @returns {Promise<string>} - Access token
 * @throws {Error} - If authentication fails
 */
async function ensureAuthenticated(forceNew = false) {
  if (forceNew) {
    // Clear tokens and force re-authentication
    await tokenStorage.clearTokens();
    throw new Error('Authentication required');
  }

  // Get a valid access token (auto-refreshes if needed)
  const accessToken = await tokenStorage.getValidAccessToken();
  if (!accessToken) {
    throw new Error('Authentication required');
  }

  return accessToken;
}

module.exports = {
  tokenStorage,
  authTools,
  ensureAuthenticated
};
