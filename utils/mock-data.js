/**
 * Mock data functions for test mode
 */

/**
 * Simulates Microsoft Graph API responses for testing
 * @param {string} method - HTTP method
 * @param {string} path - API path
 * @param {object} data - Request data
 * @param {object} queryParams - Query parameters
 * @returns {object} - Simulated API response
 */
function simulateGraphAPIResponse(method, path, data, queryParams) {
  console.error(`Simulating response for: ${method} ${path}`);
  
  if (method === 'GET') {
    if (path.includes('mailboxSettings')) {
      // Simulate mailbox settings response
      return {
        timeZone: 'Central European Standard Time',
        language: {
          locale: 'en-US',
          displayName: 'English (United States)'
        },
        workingHours: {
          daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          startTime: '09:00:00.0000000',
          endTime: '17:00:00.0000000',
          timeZone: {
            name: 'Central European Standard Time'
          }
        }
      };
    }

    if (path.includes('messages') && !path.includes('sendMail')) {
      // Simulate a successful email list/search response
      if (path.includes('/messages/')) {
        // Single email response
        return {
          id: "simulated-email-id",
          subject: "Simulated Email Subject",
          from: {
            emailAddress: {
              name: "Simulated Sender",
              address: "sender@example.com"
            }
          },
          toRecipients: [{
            emailAddress: {
              name: "Recipient Name",
              address: "recipient@example.com"
            }
          }],
          ccRecipients: [],
          bccRecipients: [],
          receivedDateTime: new Date().toISOString(),
          bodyPreview: "This is a simulated email preview...",
          body: {
            contentType: "text",
            content: "This is the full content of the simulated email. Since we can't connect to the real Microsoft Graph API, we're returning this placeholder content instead."
          },
          hasAttachments: false,
          importance: "normal",
          isRead: false,
          internetMessageHeaders: []
        };
      } else {
        // Email list response
        return {
          value: [
            {
              id: "simulated-email-1",
              subject: "Important Meeting Tomorrow",
              from: {
                emailAddress: {
                  name: "John Doe",
                  address: "john@example.com"
                }
              },
              toRecipients: [{
                emailAddress: {
                  name: "You",
                  address: "you@example.com"
                }
              }],
              ccRecipients: [],
              receivedDateTime: new Date().toISOString(),
              bodyPreview: "Let's discuss the project status...",
              hasAttachments: false,
              importance: "high",
              isRead: false
            },
            {
              id: "simulated-email-2",
              subject: "Weekly Report",
              from: {
                emailAddress: {
                  name: "Jane Smith",
                  address: "jane@example.com"
                }
              },
              toRecipients: [{
                emailAddress: {
                  name: "You",
                  address: "you@example.com"
                }
              }],
              ccRecipients: [],
              receivedDateTime: new Date(Date.now() - 86400000).toISOString(), // Yesterday
              bodyPreview: "Please find attached the weekly report...",
              hasAttachments: true,
              importance: "normal",
              isRead: true
            },
            {
              id: "simulated-email-3",
              subject: "Question about the project",
              from: {
                emailAddress: {
                  name: "Bob Johnson",
                  address: "bob@example.com"
                }
              },
              toRecipients: [{
                emailAddress: {
                  name: "You",
                  address: "you@example.com"
                }
              }],
              ccRecipients: [],
              receivedDateTime: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
              bodyPreview: "I had a question about the timeline...",
              hasAttachments: false,
              importance: "normal",
              isRead: false
            }
          ]
        };
      }
    } else if (path.includes('mailFolders')) {
      // Simulate a mail folders response
      return {
        value: [
          { id: "inbox", displayName: "Inbox" },
          { id: "drafts", displayName: "Drafts" },
          { id: "sentItems", displayName: "Sent Items" },
          { id: "deleteditems", displayName: "Deleted Items" }
        ]
      };
    }
  } else if (method === 'POST' && path.includes('sendMail')) {
    // Simulate a successful email send
    return {};
  } else if (method === 'POST' && path.includes('getSchedule')) {
    // Simulate a free/busy schedule response
    const schedules = data?.schedules || ['user@example.com'];
    const startTime = data?.startTime?.dateTime || new Date().toISOString();
    const endTime = data?.endTime?.dateTime || new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();

    return {
      value: schedules.map(email => ({
        scheduleId: email,
        availabilityView: '0000222200002222000022220000',
        workingHours: {
          startTime: '09:00:00.0000000',
          endTime: '17:00:00.0000000',
          daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          timeZone: {
            name: 'Central European Standard Time'
          }
        },
        scheduleItems: [
          {
            status: 'busy',
            start: {
              dateTime: new Date(new Date(startTime).getTime() + 2 * 60 * 60 * 1000).toISOString(),
              timeZone: 'Central European Standard Time'
            },
            end: {
              dateTime: new Date(new Date(startTime).getTime() + 3 * 60 * 60 * 1000).toISOString(),
              timeZone: 'Central European Standard Time'
            },
            subject: 'Team Meeting',
            location: 'Conference Room A'
          },
          {
            status: 'tentative',
            start: {
              dateTime: new Date(new Date(startTime).getTime() + 5 * 60 * 60 * 1000).toISOString(),
              timeZone: 'Central European Standard Time'
            },
            end: {
              dateTime: new Date(new Date(startTime).getTime() + 6 * 60 * 60 * 1000).toISOString(),
              timeZone: 'Central European Standard Time'
            },
            subject: 'Project Review',
            location: 'Online'
          }
        ]
      }))
    };
  }
  
  // If we get here, we don't have a simulation for this endpoint
  console.error(`No simulation available for: ${method} ${path}`);
  return {};
}

module.exports = {
  simulateGraphAPIResponse
};
