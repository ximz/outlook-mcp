/**
 * Create draft email functionality
 */
const { callGraphAPI } = require('../utils/graph-api');
const { ensureAuthenticated } = require('../auth');

/**
 * Create draft email handler
 * @param {object} args - Tool arguments
 * @returns {object} - MCP response
 */
async function handleCreateDraft(args) {
  const { to, cc, bcc, subject, body, importance = 'normal' } = args;
  
  try {
    // Get access token
    const accessToken = await ensureAuthenticated();
    
    // Format recipients (optional for drafts)
    const toRecipients = to ? to.split(',').map(email => ({
      emailAddress: { address: email.trim() }
    })) : [];
    
    const ccRecipients = cc ? cc.split(',').map(email => ({
      emailAddress: { address: email.trim() }
    })) : [];
    
    const bccRecipients = bcc ? bcc.split(',').map(email => ({
      emailAddress: { address: email.trim() }
    })) : [];
    
    // Prepare draft message object (note: different structure than sendMail)
    const draftMessage = {
      subject: subject || '',
      body: {
        contentType: body && body.includes('<html') ? 'html' : 'text',
        content: body || ''
      },
      importance
    };
    
    // Only add recipients if provided
    if (toRecipients.length > 0) draftMessage.toRecipients = toRecipients;
    if (ccRecipients.length > 0) draftMessage.ccRecipients = ccRecipients;
    if (bccRecipients.length > 0) draftMessage.bccRecipients = bccRecipients;
    
    // POST to /me/messages creates a draft in the Drafts folder
    const result = await callGraphAPI(accessToken, 'POST', 'me/messages', draftMessage);
    
    return {
      content: [{ 
        type: "text", 
        text: `Draft created successfully!\n\nDraft ID: ${result.id}\nSubject: ${subject || '(no subject)'}\nRecipients: ${toRecipients.length || 0}${ccRecipients.length > 0 ? ` + ${ccRecipients.length} CC` : ''}${bccRecipients.length > 0 ? ` + ${bccRecipients.length} BCC` : ''}\n\nThe draft has been saved to your Drafts folder.`
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
        text: `Error creating draft: ${error.message}`
      }]
    };
  }
}

module.exports = handleCreateDraft;
