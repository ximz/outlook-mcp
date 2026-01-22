/**
 * Send meeting invites functionality
 * Adds attendees to an existing event and sends invitations
 */
const { callGraphAPI } = require('../utils/graph-api');
const { ensureAuthenticated } = require('../auth');

/**
 * Send meeting invites handler
 * @param {object} args - Tool arguments
 * @returns {object} - MCP response
 */
async function handleSendMeetingInvites(args) {
  const { eventId, attendees } = args;

  if (!eventId) {
    return {
      content: [{
        type: "text",
        text: "Event ID is required."
      }]
    };
  }

  if (!attendees || attendees.length === 0) {
    return {
      content: [{
        type: "text",
        text: "At least one attendee email address is required."
      }]
    };
  }

  try {
    // Get access token
    const accessToken = await ensureAuthenticated();

    // Build API endpoint for updating the event
    const endpoint = `me/events/${eventId}`;

    // Request body with attendees
    const bodyContent = {
      attendees: attendees.map(email => ({
        emailAddress: { address: email },
        type: "required"
      }))
    };

    // Make PATCH API call to update the event with attendees
    // This triggers sending invitations to the new attendees
    await callGraphAPI(accessToken, 'PATCH', endpoint, bodyContent);

    return {
      content: [{
        type: "text",
        text: `Meeting invites sent to ${attendees.length} attendee(s): ${attendees.join(', ')}`
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
        text: `Error sending meeting invites: ${error.message}`
      }]
    };
  }
}

module.exports = handleSendMeetingInvites;
