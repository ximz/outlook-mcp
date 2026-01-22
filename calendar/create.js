/**
 * Create event functionality
 */
const { callGraphAPI } = require('../utils/graph-api');
const { ensureAuthenticated } = require('../auth');
const { getMailboxTimezone } = require('../utils/mailbox-settings');

/**
 * Create event handler
 * @param {object} args - Tool arguments
 * @returns {object} - MCP response
 */
async function handleCreateEvent(args) {
  const { subject, start, end, timezone, attendees, body, draft } = args;

  if (!subject || !start || !end) {
    return {
      content: [{
        type: "text",
        text: "Subject, start, and end times are required to create an event."
      }]
    };
  }

  try {
    // Get access token
    const accessToken = await ensureAuthenticated();

    // Build API endpoint
    const endpoint = `me/events`;

    // Get the user's mailbox timezone for the default
    const mailboxTimezone = await getMailboxTimezone(accessToken);

    // Determine the timezone to use (parameter > object property > mailbox default)
    const eventTimezone = timezone || start.timeZone || mailboxTimezone;

    // Strip timezone offset from ISO strings if present (e.g., "2026-01-26T13:00:00-05:00" -> "2026-01-26T13:00:00")
    const stripTimezoneOffset = (dateTimeStr) => {
      if (typeof dateTimeStr === 'string') {
        // Remove timezone offset (±HH:MM or ±HHMM or Z) from the end
        return dateTimeStr.replace(/([+-]\d{2}:?\d{2}|Z)$/, '');
      }
      return dateTimeStr;
    };

    const startDateTime = stripTimezoneOffset(start.dateTime || start);
    const endDateTime = stripTimezoneOffset(end.dateTime || end);

    // Request body - omit attendees if draft mode to prevent sending invites
    const bodyContent = {
      subject,
      start: { dateTime: startDateTime, timeZone: eventTimezone },
      end: { dateTime: endDateTime, timeZone: eventTimezone },
      body: { contentType: "HTML", content: body || "" }
    };

    // Only include attendees if not in draft mode
    if (!draft && attendees?.length > 0) {
      bodyContent.attendees = attendees.map(email => ({ emailAddress: { address: email }, type: "required" }));
    }

    // Make API call
    const response = await callGraphAPI(accessToken, 'POST', endpoint, bodyContent);

    if (draft) {
      const pendingAttendees = attendees?.length > 0 ? ` Pending attendees: ${attendees.join(', ')}.` : '';
      return {
        content: [{
          type: "text",
          text: `Draft event '${subject}' has been created (no invites sent). Event ID: ${response.id}.${pendingAttendees} Use 'send-meeting-invites' to add attendees and send invitations.`
        }]
      };
    }

    return {
      content: [{
        type: "text",
        text: `Event '${subject}' has been successfully created.${response.id ? ` Event ID: ${response.id}` : ''}`
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
        text: `Error creating event: ${error.message}`
      }]
    };
  }
}

module.exports = handleCreateEvent;