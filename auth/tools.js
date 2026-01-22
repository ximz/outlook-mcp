/**
 * Authentication-related tools for the Outlook MCP server
 * Uses device code flow for authentication
 */
const config = require('../config');
const TokenStorage = require('./token-storage');

// Create TokenStorage instance for auth tools
const tokenStorage = new TokenStorage();

/**
 * About tool handler
 * @returns {object} - MCP response
 */
async function handleAbout() {
  return {
    content: [{
      type: "text",
      text: `Outlook Assistant MCP Server v${config.SERVER_VERSION}\n\nProvides access to Microsoft Outlook email, calendar, and contacts through Microsoft Graph API.\nUses device code flow for authentication.`
    }]
  };
}

/**
 * Authentication tool handler - initiates device code flow
 * @param {object} args - Tool arguments
 * @returns {object} - MCP response
 */
async function handleAuthenticate(args) {
  const force = args && args.force === true;

  // For test mode, create a test token
  if (config.USE_TEST_MODE) {
    // Create test tokens directly
    tokenStorage.tokens = {
      access_token: "test_access_token_" + Date.now(),
      refresh_token: "test_refresh_token_" + Date.now(),
      expires_at: Date.now() + (3600 * 1000)
    };

    return {
      content: [{
        type: "text",
        text: 'Successfully authenticated with Microsoft Graph API (test mode)'
      }]
    };
  }

  // Clear tokens if force re-auth
  if (force) {
    await tokenStorage.clearTokens();
  }

  // Check if already authenticated with valid tokens
  const existingToken = await tokenStorage.getValidAccessToken();
  if (existingToken && !force) {
    return {
      content: [{
        type: "text",
        text: 'Already authenticated with Microsoft Graph API. Use force=true to re-authenticate.'
      }]
    };
  }

  try {
    // Request device code
    const deviceCode = await tokenStorage.requestDeviceCode();

    return {
      content: [{
        type: "text",
        text: `Authentication required. Please complete these steps:\n\n` +
          `1. Go to: ${deviceCode.verification_uri}\n` +
          `2. Enter code: ${deviceCode.user_code}\n` +
          `3. Sign in with your Microsoft account\n` +
          `4. After signing in, run the 'complete-auth' tool to finish authentication\n\n` +
          `The code expires in ${Math.floor(deviceCode.expires_in / 60)} minutes.`
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Failed to initiate authentication: ${error.message}`
      }],
      isError: true
    };
  }
}

/**
 * Complete authentication tool handler - polls for device code token
 * @returns {object} - MCP response
 */
async function handleCompleteAuth() {
  if (config.USE_TEST_MODE) {
    return {
      content: [{
        type: "text",
        text: 'Authentication completed (test mode)'
      }]
    };
  }

  try {
    // Poll for the token (will wait for user to complete browser auth)
    await tokenStorage.pollForDeviceCodeToken(24); // ~2 minutes with 5s interval

    return {
      content: [{
        type: "text",
        text: 'Successfully authenticated with Microsoft Graph API! You can now use email and calendar tools.'
      }]
    };
  } catch (error) {
    if (error.message.includes('pending') || error.message.includes('No pending device code')) {
      return {
        content: [{
          type: "text",
          text: `No pending authentication. Please run 'authenticate' first to get a device code.`
        }],
        isError: true
      };
    }

    if (error.message.includes('expired')) {
      return {
        content: [{
          type: "text",
          text: `Device code expired. Please run 'authenticate' again to get a new code.`
        }],
        isError: true
      };
    }

    if (error.message.includes('timed out')) {
      return {
        content: [{
          type: "text",
          text: `Polling timed out. If you've completed sign-in in the browser, try running 'complete-auth' again. Otherwise, run 'authenticate' to get a new code.`
        }],
        isError: true
      };
    }

    return {
      content: [{
        type: "text",
        text: `Authentication failed: ${error.message}`
      }],
      isError: true
    };
  }
}

/**
 * Check authentication status tool handler
 * @returns {object} - MCP response
 */
async function handleCheckAuthStatus() {
  console.error('[CHECK-AUTH-STATUS] Starting authentication status check');

  try {
    const accessToken = await tokenStorage.getValidAccessToken();

    if (!accessToken) {
      console.error('[CHECK-AUTH-STATUS] No valid access token found');
      return {
        content: [{ type: "text", text: "Not authenticated. Run 'authenticate' to sign in." }]
      };
    }

    const tokens = await tokenStorage.getTokens();
    const expiresAt = tokens?.expires_at;
    const expiresIn = expiresAt ? Math.floor((expiresAt - Date.now()) / 1000 / 60) : 0;

    console.error('[CHECK-AUTH-STATUS] Authenticated with valid token');
    return {
      content: [{
        type: "text",
        text: `Authenticated and ready. Token expires in ${expiresIn} minutes.`
      }]
    };
  } catch (error) {
    console.error('[CHECK-AUTH-STATUS] Error:', error);
    return {
      content: [{ type: "text", text: "Not authenticated. Run 'authenticate' to sign in." }]
    };
  }
}

// Tool definitions
const authTools = [
  {
    name: "about",
    description: "Returns information about this Outlook Assistant server",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    },
    handler: handleAbout
  },
  {
    name: "authenticate",
    description: "Start authentication with Microsoft Graph API using device code flow. Returns a code to enter at microsoft.com/devicelogin",
    inputSchema: {
      type: "object",
      properties: {
        force: {
          type: "boolean",
          description: "Force re-authentication even if already authenticated"
        }
      },
      required: []
    },
    handler: handleAuthenticate
  },
  {
    name: "complete-auth",
    description: "Complete the authentication after signing in at microsoft.com/devicelogin. Run this after entering the device code in your browser.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    },
    handler: handleCompleteAuth
  },
  {
    name: "check-auth-status",
    description: "Check the current authentication status with Microsoft Graph API",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    },
    handler: handleCheckAuthStatus
  }
];

module.exports = {
  authTools,
  handleAbout,
  handleAuthenticate,
  handleCompleteAuth,
  handleCheckAuthStatus
};
