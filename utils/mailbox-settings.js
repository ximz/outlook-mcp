/**
 * Mailbox settings utilities
 * Fetches and caches user mailbox settings including timezone
 */
const { callGraphAPI } = require('./graph-api');
const { DEFAULT_TIMEZONE } = require('../config');

// Cache for mailbox timezone with TTL
let cachedTimezone = null;
let cacheTimestamp = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Get the user's mailbox timezone from Microsoft Graph API
 * Prefers the working hours timezone over the general mailbox timezone,
 * as this better reflects the user's actual calendar timezone.
 * Results are cached for 1 hour to avoid repeated API calls.
 * @param {string} accessToken - OAuth access token
 * @returns {Promise<string>} - The mailbox timezone or fallback to DEFAULT_TIMEZONE
 */
async function getMailboxTimezone(accessToken) {
  // Check if we have a valid cached value
  if (cachedTimezone && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_TTL_MS)) {
    return cachedTimezone;
  }

  try {
    const response = await callGraphAPI(accessToken, 'GET', 'me/mailboxSettings');

    // Prefer working hours timezone over general mailbox timezone
    // Working hours timezone better reflects calendar/scheduling preferences
    if (response?.workingHours?.timeZone?.name) {
      cachedTimezone = response.workingHours.timeZone.name;
      cacheTimestamp = Date.now();
      return cachedTimezone;
    }

    // Fall back to general mailbox timezone
    if (response?.timeZone) {
      cachedTimezone = response.timeZone;
      cacheTimestamp = Date.now();
      return cachedTimezone;
    }

    // If no timezone in response, fall back to default
    return DEFAULT_TIMEZONE;
  } catch (error) {
    console.error(`Failed to fetch mailbox timezone: ${error.message}. Using default.`);
    return DEFAULT_TIMEZONE;
  }
}

/**
 * Clear the cached timezone
 * Useful for testing or when the user's settings may have changed
 */
function clearTimezoneCache() {
  cachedTimezone = null;
  cacheTimestamp = null;
}

module.exports = {
  getMailboxTimezone,
  clearTimezoneCache
};
