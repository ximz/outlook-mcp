const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const querystring = require('querystring');

class TokenStorage {
  constructor(config) {
    this.config = {
      tokenStorePath: path.join(process.env.HOME || process.env.USERPROFILE, '.msgraph', '.outlook-mcp-tokens.json'),
      deviceCodeStatePath: path.join(process.env.HOME || process.env.USERPROFILE, '.msgraph', '.outlook-mcp-device-code.json'),
      clientId: process.env.MS_CLIENT_ID || process.env.OUTLOOK_CLIENT_ID,
      clientSecret: process.env.MS_CLIENT_SECRET || process.env.OUTLOOK_CLIENT_SECRET,
      scopes: (process.env.MS_SCOPES || 'offline_access User.Read Mail.Read Mail.ReadWrite Mail.Send Calendars.ReadWrite').split(' '),
      tokenEndpoint: process.env.MS_TOKEN_ENDPOINT || 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      deviceCodeEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/devicecode',
      refreshTokenBuffer: 5 * 60 * 1000, // 5 minutes buffer for token refresh
      ...config // Allow overriding default config
    };
    this.tokens = null;
    this._loadPromise = null;
    this._refreshPromise = null;
    this._pendingDeviceCode = null;

    if (!this.config.clientId) {
      console.warn("TokenStorage: MS_CLIENT_ID/OUTLOOK_CLIENT_ID is not configured. Token operations might fail.");
    }
  }

  /**
   * Sleep helper for polling
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Load pending device code state from file (for server restarts)
   * @returns {Promise<object|null>}
   */
  async _loadDeviceCodeState() {
    try {
      const data = await fs.readFile(this.config.deviceCodeStatePath, 'utf8');
      const state = JSON.parse(data);
      // Check if device code has expired
      if (state.expires_at && Date.now() >= state.expires_at) {
        console.log('Stored device code has expired.');
        await this._clearDeviceCodeState();
        return null;
      }
      this._pendingDeviceCode = state;
      return state;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Error loading device code state:', error);
      }
      return null;
    }
  }

  /**
   * Save pending device code state to file
   * @returns {Promise<void>}
   */
  async _saveDeviceCodeState() {
    if (!this._pendingDeviceCode) return;
    try {
      // Ensure directory exists
      const dir = path.dirname(this.config.deviceCodeStatePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(this.config.deviceCodeStatePath, JSON.stringify(this._pendingDeviceCode, null, 2));
    } catch (error) {
      console.error('Error saving device code state:', error);
    }
  }

  /**
   * Clear pending device code state
   * @returns {Promise<void>}
   */
  async _clearDeviceCodeState() {
    this._pendingDeviceCode = null;
    try {
      await fs.unlink(this.config.deviceCodeStatePath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Error clearing device code state:', error);
      }
    }
  }

  /**
   * Request a device code for authentication
   * @returns {Promise<object>} - Object containing user_code, verification_uri, and message
   */
  async requestDeviceCode() {
    if (!this.config.clientId) {
      throw new Error('Client ID is not configured. Cannot request device code.');
    }

    console.log('Requesting device code...');
    const postData = querystring.stringify({
      client_id: this.config.clientId,
      scope: this.config.scopes.join(' ')
    });

    return new Promise((resolve, reject) => {
      const url = new URL(this.config.deviceCodeEndpoint);
      const requestOptions = {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(requestOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', async () => {
          try {
            const responseBody = JSON.parse(data);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              // Store device code for polling
              this._pendingDeviceCode = {
                device_code: responseBody.device_code,
                user_code: responseBody.user_code,
                verification_uri: responseBody.verification_uri,
                expires_in: responseBody.expires_in,
                expires_at: Date.now() + (responseBody.expires_in * 1000),
                interval: responseBody.interval || 5
              };
              await this._saveDeviceCodeState();
              console.log('Device code received successfully.');
              resolve({
                user_code: responseBody.user_code,
                verification_uri: responseBody.verification_uri,
                message: responseBody.message,
                expires_in: responseBody.expires_in
              });
            } else {
              console.error('Error requesting device code:', responseBody);
              reject(new Error(responseBody.error_description || `Device code request failed with status ${res.statusCode}`));
            }
          } catch (e) {
            console.error('Error processing device code response:', e, 'Raw data:', data);
            reject(new Error(`Error processing device code response: ${e.message}`));
          }
        });
      });

      req.on('error', (error) => {
        console.error('HTTP error during device code request:', error);
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Poll for device code token after user has authenticated
   * @param {number} maxAttempts - Maximum number of polling attempts (default: 24, ~2 minutes with 5s interval)
   * @returns {Promise<object>} - The tokens on success
   */
  async pollForDeviceCodeToken(maxAttempts = 24) {
    // Try to load pending device code state if not in memory
    if (!this._pendingDeviceCode) {
      await this._loadDeviceCodeState();
    }

    if (!this._pendingDeviceCode || !this._pendingDeviceCode.device_code) {
      throw new Error('No pending device code. Please call requestDeviceCode() first.');
    }

    // Check if device code has expired
    if (Date.now() >= this._pendingDeviceCode.expires_at) {
      await this._clearDeviceCodeState();
      throw new Error('Device code has expired. Please request a new code.');
    }

    let interval = this._pendingDeviceCode.interval * 1000; // Convert to ms
    let attempts = 0;

    console.log('Polling for device code token...');

    while (attempts < maxAttempts) {
      attempts++;

      const postData = querystring.stringify({
        client_id: this.config.clientId,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: this._pendingDeviceCode.device_code
      });

      try {
        const result = await new Promise((resolve, reject) => {
          const url = new URL(this.config.tokenEndpoint);
          const requestOptions = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Content-Length': Buffer.byteLength(postData)
            }
          };

          const req = https.request(requestOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
              try {
                const responseBody = JSON.parse(data);
                resolve({ statusCode: res.statusCode, body: responseBody });
              } catch (e) {
                reject(new Error(`Error parsing token response: ${e.message}`));
              }
            });
          });

          req.on('error', (error) => reject(error));
          req.write(postData);
          req.end();
        });

        if (result.statusCode >= 200 && result.statusCode < 300) {
          // Success! Save tokens
          this.tokens = {
            access_token: result.body.access_token,
            refresh_token: result.body.refresh_token,
            expires_in: result.body.expires_in,
            expires_at: Date.now() + (result.body.expires_in * 1000),
            scope: result.body.scope,
            token_type: result.body.token_type
          };

          // Ensure directory exists before saving
          const dir = path.dirname(this.config.tokenStorePath);
          await fs.mkdir(dir, { recursive: true });

          await this._saveTokensToFile();
          await this._clearDeviceCodeState();
          console.log('Device code authentication successful!');
          return this.tokens;
        }

        // Handle specific error cases
        const error = result.body.error;
        if (error === 'authorization_pending') {
          console.log(`Attempt ${attempts}/${maxAttempts}: Authorization pending, waiting...`);
          await this._sleep(interval);
          continue;
        } else if (error === 'slow_down') {
          console.log('Received slow_down, increasing interval...');
          interval += 5000; // Add 5 seconds
          await this._sleep(interval);
          continue;
        } else if (error === 'expired_token') {
          await this._clearDeviceCodeState();
          throw new Error('Device code has expired. Please request a new code.');
        } else if (error === 'access_denied') {
          await this._clearDeviceCodeState();
          throw new Error('User declined the authorization request.');
        } else {
          await this._clearDeviceCodeState();
          throw new Error(result.body.error_description || `Token request failed: ${error}`);
        }
      } catch (e) {
        if (e.message.includes('authorization pending') || e.message.includes('pending')) {
          await this._sleep(interval);
          continue;
        }
        throw e;
      }
    }

    throw new Error('Polling timed out. Please try again or request a new device code.');
  }

  async _loadTokensFromFile() {
    try {
      const tokenData = await fs.readFile(this.config.tokenStorePath, 'utf8');
      this.tokens = JSON.parse(tokenData);
      console.log('Tokens loaded from file.');
      return this.tokens;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('Token file not found. No tokens loaded.');
      } else {
        console.error('Error loading token cache:', error);
      }
      this.tokens = null;
      return null;
    }
  }

  async _saveTokensToFile() {
    if (!this.tokens) {
      console.warn('No tokens to save.');
      return false;
    }
    try {
      // Ensure directory exists
      const dir = path.dirname(this.config.tokenStorePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(this.config.tokenStorePath, JSON.stringify(this.tokens, null, 2));
      console.log('Tokens saved successfully.');
    } catch (error) {
      console.error('Error saving token cache:', error);
      throw error; // Propagate the error
    }
  }

  async getTokens() {
    if (this.tokens) {
      return this.tokens;
    }
    if (!this._loadPromise) {
        this._loadPromise = this._loadTokensFromFile().finally(() => {
            this._loadPromise = null; // Reset promise once completed
        });
    }
    return this._loadPromise;
  }

  getExpiryTime() {
    return this.tokens && this.tokens.expires_at ? this.tokens.expires_at : 0;
  }

  isTokenExpired() {
    if (!this.tokens || !this.tokens.expires_at) {
      return true; // No token or no expiry means it's effectively expired or invalid
    }
    // Check if current time is past expiry time, considering a buffer
    return Date.now() >= (this.tokens.expires_at - this.config.refreshTokenBuffer);
  }

  async getValidAccessToken() {
    await this.getTokens(); // Ensure tokens are loaded

    if (!this.tokens || !this.tokens.access_token) {
      console.log('No access token available.');
      return null;
    }

    if (this.isTokenExpired()) {
      console.log('Access token expired or nearing expiration. Attempting refresh.');
      if (this.tokens.refresh_token) {
        try {
          return await this.refreshAccessToken();
        } catch (refreshError) {
          console.error('Failed to refresh access token:', refreshError);
          this.tokens = null; // Invalidate tokens on refresh failure
          await this._saveTokensToFile(); // Persist invalidation
          return null;
        }
      } else {
        console.warn('No refresh token available. Cannot refresh access token.');
        this.tokens = null; // Invalidate tokens as they are expired and cannot be refreshed
        await this._saveTokensToFile(); // Persist invalidation
        return null;
      }
    }
    return this.tokens.access_token;
  }

  async refreshAccessToken() {
    if (!this.tokens || !this.tokens.refresh_token) {
      throw new Error('No refresh token available to refresh the access token.');
    }

    // Prevent multiple concurrent refresh attempts
    if (this._refreshPromise) {
        console.log("Refresh already in progress, returning existing promise.");
        return this._refreshPromise.then(tokens => tokens.access_token);
    }

    console.log('Attempting to refresh access token...');
    const tokenParams = {
      client_id: this.config.clientId,
      grant_type: 'refresh_token',
      refresh_token: this.tokens.refresh_token,
      scope: this.config.scopes.join(' ')
    };
    // Only include client_secret if configured (not needed for public apps using device code)
    if (this.config.clientSecret) {
      tokenParams.client_secret = this.config.clientSecret;
    }
    const postData = querystring.stringify(tokenParams);

    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    this._refreshPromise = new Promise((resolve, reject) => {
        const req = https.request(this.config.tokenEndpoint, requestOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', async () => {
                try {
                    const responseBody = JSON.parse(data);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        this.tokens.access_token = responseBody.access_token;
                        // Microsoft Graph API refresh tokens may or may not return a new refresh_token
                        if (responseBody.refresh_token) {
                            this.tokens.refresh_token = responseBody.refresh_token;
                        }
                        this.tokens.expires_in = responseBody.expires_in;
                        this.tokens.expires_at = Date.now() + (responseBody.expires_in * 1000);
                        try {
                            await this._saveTokensToFile();
                            console.log('Access token refreshed and saved successfully.');
                            resolve(this.tokens);
                        } catch (saveError) {
                            console.error('Failed to save refreshed tokens:', saveError);
                            // Even if save fails, tokens are updated in memory.
                            // Depending on desired strictness, could reject here.
                            // For now, resolve with in-memory tokens but log critical error.
                            // Or, to be stricter and align with re-throwing:
                            reject(new Error(`Access token refreshed but failed to save: ${saveError.message}`));
                        }
                    } else {
                        console.error('Error refreshing token:', responseBody);
                        reject(new Error(responseBody.error_description || `Token refresh failed with status ${res.statusCode}`));
                    }
                } catch (e) { // Catch any error during parsing or saving
                    console.error('Error processing refresh token response or saving tokens:', e);
                    reject(e);
                } finally {
                    this._refreshPromise = null; // Clear promise after completion
                }
            });
        });
        req.on('error', (error) => {
            console.error('HTTP error during token refresh:', error);
            reject(error);
            this._refreshPromise = null; // Clear promise on error
        });
        req.write(postData);
        req.end();
    });

    return this._refreshPromise.then(tokens => tokens.access_token);
  }

  // Utility to clear tokens, e.g., for logout or forcing re-auth
  async clearTokens() {
    this.tokens = null;
    try {
      await fs.unlink(this.config.tokenStorePath);
      console.log('Token file deleted successfully.');
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('Token file not found, nothing to delete.');
      } else {
        console.error('Error deleting token file:', error);
      }
    }
  }
}

module.exports = TokenStorage;
// Adding a newline at the end of the file as requested by Gemini Code Assist
