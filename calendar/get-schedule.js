/**
 * Get free/busy schedule functionality
 */
const config = require('../config');
const { callGraphAPI } = require('../utils/graph-api');
const { ensureAuthenticated } = require('../auth');
const { formatEventDateTime } = require('../utils/datetime-helpers');

/**
 * Get schedule/free-busy handler
 * @param {object} args - Tool arguments
 * @returns {object} - MCP response
 */
async function handleGetSchedule(args) {
  const { schedules, startTime, endTime, availabilityViewInterval } = args;

  // Validate schedules array
  if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
    return {
      content: [{
        type: "text",
        text: "Error: schedules must be a non-empty array of email addresses"
      }]
    };
  }

  if (schedules.length > 20) {
    return {
      content: [{
        type: "text",
        text: "Error: Maximum of 20 email addresses allowed per request"
      }]
    };
  }

  try {
    // Get access token
    const accessToken = await ensureAuthenticated();

    // Build request body
    const requestBody = {
      schedules: schedules,
      startTime: {
        dateTime: startTime,
        timeZone: config.DEFAULT_TIMEZONE
      },
      endTime: {
        dateTime: endTime,
        timeZone: config.DEFAULT_TIMEZONE
      }
    };

    // Add optional interval if provided
    if (availabilityViewInterval) {
      requestBody.availabilityViewInterval = availabilityViewInterval;
    }

    // Make API call to getSchedule endpoint
    const response = await callGraphAPI(
      accessToken,
      'POST',
      'me/calendar/getSchedule',
      requestBody
    );

    if (!response.value || response.value.length === 0) {
      return {
        content: [{
          type: "text",
          text: "No schedule information returned."
        }]
      };
    }

    // Format the results
    const scheduleResults = response.value.map(schedule => {
      const email = schedule.scheduleId;
      const availabilityView = schedule.availabilityView || '';
      const workingHours = schedule.workingHours;
      const scheduleItems = schedule.scheduleItems || [];

      let result = `\n## ${email}\n`;

      // Availability view legend: 0=free, 1=tentative, 2=busy, 3=oof, 4=working elsewhere
      if (availabilityView) {
        result += `Availability: ${formatAvailabilityView(availabilityView)}\n`;
      }

      // Working hours
      if (workingHours) {
        result += `Working hours: ${workingHours.startTime} - ${workingHours.endTime} (${workingHours.timeZone?.name || 'Unknown timezone'})\n`;
        if (workingHours.daysOfWeek && workingHours.daysOfWeek.length > 0) {
          result += `Working days: ${workingHours.daysOfWeek.join(', ')}\n`;
        }
      }

      // Schedule items (actual calendar blocks)
      if (scheduleItems.length > 0) {
        result += `\nScheduled items:\n`;
        scheduleItems.forEach(item => {
          const status = item.status || 'unknown';
          const start = formatEventDateTime(item.start);
          const end = formatEventDateTime(item.end);
          const subject = item.subject || '(No subject)';
          const location = item.location || '';

          result += `  - [${status.toUpperCase()}] ${start} - ${end}`;
          if (subject !== '(No subject)') {
            result += `: ${subject}`;
          }
          if (location) {
            result += ` (${location})`;
          }
          result += '\n';
        });
      } else {
        result += `\nNo scheduled items in this time range.\n`;
      }

      return result;
    }).join('\n---\n');

    return {
      content: [{
        type: "text",
        text: `# Free/Busy Schedule\n\nTime range: ${startTime} to ${endTime}\nTimezone: ${config.DEFAULT_TIMEZONE}\n${scheduleResults}`
      }]
    };
  } catch (error) {
    if (error.message === 'Authentication required') {
      return {
        content: [{
          type: "text",
          text: "Authentication required. Please use the 'authenticate' tool first."
        }]
      };
    }

    return {
      content: [{
        type: "text",
        text: `Error getting schedule: ${error.message}`
      }]
    };
  }
}

/**
 * Formats the availability view string into human-readable format
 * @param {string} availabilityView - String of digits representing availability
 * @returns {string} - Formatted availability legend
 */
function formatAvailabilityView(availabilityView) {
  const legend = {
    '0': 'Free',
    '1': 'Tentative',
    '2': 'Busy',
    '3': 'Out of Office',
    '4': 'Working Elsewhere'
  };

  // Count occurrences
  const counts = {};
  for (const char of availabilityView) {
    const status = legend[char] || 'Unknown';
    counts[status] = (counts[status] || 0) + 1;
  }

  // Format as summary
  const summary = Object.entries(counts)
    .map(([status, count]) => `${status}: ${count} slots`)
    .join(', ');

  return summary;
}

module.exports = handleGetSchedule;
