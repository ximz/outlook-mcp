/**
 * DateTime formatting utilities for Microsoft Graph API responses
 */

/**
 * Get the system's local timezone
 * @returns {string} IANA timezone identifier
 */
function getSystemTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Format a Microsoft Graph datetime object to a human-readable local string
 *
 * Microsoft Graph returns datetime in two formats:
 * 1. With timeZone property: { dateTime: "2024-01-15T10:00:00.0000000", timeZone: "UTC" }
 * 2. ISO 8601 with Z suffix: "2024-01-15T10:00:00Z"
 *
 * @param {string} dateTimeStr - The dateTime string from Graph API
 * @param {string} [sourceTimezone] - The timezone of the dateTime (from Graph API)
 * @returns {string} Formatted date string in user's local timezone
 */
function formatGraphDateTime(dateTimeStr, sourceTimezone) {
  if (!dateTimeStr) {
    return 'Unknown';
  }

  try {
    let dateStr = dateTimeStr;

    // If the source timezone is UTC and the string doesn't end with Z, append it
    // This ensures JavaScript correctly interprets it as UTC
    if (sourceTimezone === 'UTC' && !dateStr.endsWith('Z')) {
      dateStr = dateStr + 'Z';
    }

    const date = new Date(dateStr);

    // Check for invalid date
    if (isNaN(date.getTime())) {
      return dateTimeStr; // Return original if parsing fails
    }

    // Format using user's locale and system timezone
    return date.toLocaleString(undefined, {
      timeZone: getSystemTimezone(),
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    // Fallback to original string if formatting fails
    return dateTimeStr;
  }
}

/**
 * Format a Microsoft Graph event's start/end time
 * Handles the Graph API event datetime structure: { dateTime: "...", timeZone: "..." }
 *
 * @param {object} graphDateTimeObj - Object with dateTime and timeZone properties
 * @returns {string} Formatted date string
 */
function formatEventDateTime(graphDateTimeObj) {
  if (!graphDateTimeObj || !graphDateTimeObj.dateTime) {
    return 'Unknown';
  }
  return formatGraphDateTime(graphDateTimeObj.dateTime, graphDateTimeObj.timeZone);
}

module.exports = {
  getSystemTimezone,
  formatGraphDateTime,
  formatEventDateTime
};
