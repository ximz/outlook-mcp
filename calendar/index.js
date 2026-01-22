/**
 * Calendar module for Outlook MCP server
 */
const handleListEvents = require('./list');
const handleDeclineEvent = require('./decline');
const handleCreateEvent = require('./create');
const handleCancelEvent = require('./cancel');
const handleDeleteEvent = require('./delete');
const handleGetSchedule = require('./get-schedule');
const handleSendMeetingInvites = require('./send-invites');

// Calendar tool definitions
const calendarTools = [
  {
    name: "list-events",
    description: "Lists upcoming events from your calendar",
    inputSchema: {
      type: "object",
      properties: {
        count: {
          type: "number",
          description: "Number of events to retrieve (default: 10, max: 50)"
        }
      },
      required: []
    },
    handler: handleListEvents
  },
  {
    name: "decline-event",
    description: "Declines a calendar event",
    inputSchema: {
      type: "object",
      properties: {
        eventId: {
          type: "string",
          description: "The ID of the event to decline"
        },
        comment: {
          type: "string",
          description: "Optional comment for declining the event"
        }
      },
      required: ["eventId"]
    },
    handler: handleDeclineEvent
  },
  {
    name: "create-event",
    description: "Creates a new calendar event. Use draft mode to create without sending invites.",
    inputSchema: {
      type: "object",
      properties: {
        subject: {
          type: "string",
          description: "The subject of the event"
        },
        start: {
          type: "string",
          description: "The start time of the event in ISO 8601 format (e.g., '2026-01-26T13:00:00'). Do not include timezone offset - use the timezone parameter instead."
        },
        end: {
          type: "string",
          description: "The end time of the event in ISO 8601 format (e.g., '2026-01-26T14:00:00'). Do not include timezone offset - use the timezone parameter instead."
        },
        timezone: {
          type: "string",
          description: "Windows timezone name for the event. Common values: 'Eastern Standard Time', 'Central Standard Time', 'Mountain Standard Time', 'Pacific Standard Time', 'UTC', 'Central European Standard Time'. Note: Despite 'Standard' in the name, these automatically handle Daylight Saving Time. Defaults to 'Central European Standard Time' if not specified."
        },
        attendees: {
          type: "array",
          items: {
            type: "string"
          },
          description: "List of attendee email addresses"
        },
        body: {
          type: "string",
          description: "Optional body content for the event"
        },
        draft: {
          type: "boolean",
          description: "If true, creates the event without sending invites to attendees. Use 'send-meeting-invites' later to add attendees."
        }
      },
      required: ["subject", "start", "end"]
    },
    handler: handleCreateEvent
  },
  {
    name: "cancel-event",
    description: "Cancels a calendar event",
    inputSchema: {
      type: "object",
      properties: {
        eventId: {
          type: "string",
          description: "The ID of the event to cancel"
        },
        comment: {
          type: "string",
          description: "Optional comment for cancelling the event"
        }
      },
      required: ["eventId"]
    },
    handler: handleCancelEvent
  },
  {
    name: "delete-event",
    description: "Deletes a calendar event",
    inputSchema: {
      type: "object",
      properties: {
        eventId: {
          type: "string",
          description: "The ID of the event to delete"
        }
      },
      required: ["eventId"]
    },
    handler: handleDeleteEvent
  },
  {
    name: "get-schedule",
    description: "Gets the free/busy schedule for a list of users. Returns availability information for up to 20 email addresses within a specified time range.",
    inputSchema: {
      type: "object",
      properties: {
        schedules: {
          type: "array",
          items: {
            type: "string"
          },
          description: "List of email addresses to get availability for (max 20)"
        },
        startTime: {
          type: "string",
          description: "Start of the time range in ISO 8601 format (e.g., '2024-01-15T09:00:00')"
        },
        endTime: {
          type: "string",
          description: "End of the time range in ISO 8601 format (e.g., '2024-01-15T18:00:00')"
        },
        availabilityViewInterval: {
          type: "number",
          description: "Optional duration of time slots in minutes (default: 30)"
        }
      },
      required: ["schedules", "startTime", "endTime"]
    },
    handler: handleGetSchedule
  },
  {
    name: "send-meeting-invites",
    description: "Adds attendees to an existing calendar event and sends meeting invitations. Use this after creating a draft event.",
    inputSchema: {
      type: "object",
      properties: {
        eventId: {
          type: "string",
          description: "The ID of the event to send invites for"
        },
        attendees: {
          type: "array",
          items: {
            type: "string"
          },
          description: "List of attendee email addresses to invite"
        }
      },
      required: ["eventId", "attendees"]
    },
    handler: handleSendMeetingInvites
  }
];

module.exports = {
  calendarTools,
  handleListEvents,
  handleDeclineEvent,
  handleCreateEvent,
  handleCancelEvent,
  handleDeleteEvent,
  handleGetSchedule,
  handleSendMeetingInvites
};
