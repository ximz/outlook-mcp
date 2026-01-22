[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/ryaker-outlook-mcp-badge.png)](https://mseep.ai/app/ryaker-outlook-mcp)

# Modular Outlook MCP Server

This is a modular implementation of the Outlook MCP (Model Context Protocol) server that connects Claude with Microsoft Outlook through the Microsoft Graph API.
Certified by MCPHub https://mcphub.com/mcp-servers/ryaker/outlook-mcp

## Directory Structure

```
/modular/
├── index.js                 # Main entry point
├── config.js                # Configuration settings
├── auth/                    # Authentication modules
│   ├── index.js             # Authentication exports
│   ├── token-storage.js     # Token storage, refresh, and device code flow
│   └── tools.js             # Auth-related tools
├── calendar/                # Calendar functionality
│   ├── index.js             # Calendar exports
│   ├── list.js              # List events
│   ├── create.js            # Create event
│   ├── delete.js            # Delete event
│   ├── cancel.js            # Cancel
│   ├── accept.js            # Accept event
│   ├── tentative.js         # Tentatively accept event
│   ├── decline.js           # Decline event
├── email/                   # Email functionality
│   ├── index.js             # Email exports
│   ├── list.js              # List emails
│   ├── search.js            # Search emails
│   ├── read.js              # Read email
│   └── send.js              # Send email
└── utils/                   # Utility functions
    ├── graph-api.js         # Microsoft Graph API helper
    ├── odata-helpers.js     # OData query building
    └── mock-data.js         # Test mode data
```

## Features

- **Authentication**: Device code flow authentication with automatic token refresh
- **Email Management**: List, search, read, and send emails
- **Calendar Management**: List, create, accept, decline, and delete calendar events
- **Modular Structure**: Clean separation of concerns for better maintainability
- **OData Filter Handling**: Proper escaping and formatting of OData queries
- **Test Mode**: Simulated responses for testing without real API calls

## Quick Start

1. **Install dependencies**: `npm install`
2. **Azure setup**: Register app in Azure Portal (see detailed steps below)
3. **Configure environment**: Copy `.env.example` to `.env` and add your Azure client ID
4. **Configure Claude**: Update your Claude Desktop config with the server path
5. **Authenticate**: Use the `authenticate` tool to get a device code, then `complete-auth` to finish
6. **Start using**: Access your Outlook data through Claude!

## Installation

### Prerequisites
- Node.js 14.0.0 or higher
- npm or yarn package manager
- Azure account for app registration

### Install Dependencies

```bash
npm install
```

This will install the required dependencies including:
- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `dotenv` - Environment variable management

## Azure App Registration & Configuration

To use this MCP server you need to first register and configure an app in Azure Portal. The following steps will take you through the process of registering a new app, configuring its permissions, and enabling device code flow.

### App Registration

1. Open [Azure Portal](https://portal.azure.com/) in your browser
2. Sign in with a Microsoft Work or Personal account
3. Search for or click on "App registrations"
4. Click on "New registration"
5. Enter a name for the app, for example "Outlook MCP Server"
6. Select the "Accounts in any organizational directory and personal Microsoft accounts" option
7. In the "Redirect URI" section, select "Mobile and desktop applications" and enter `https://login.microsoftonline.com/common/oauth2/nativeclient`
8. Click on "Register"
9. From the Overview section of the app settings page, copy the "Application (client) ID" and save it for configuration

### Enable Public Client Flow (Required for Device Code)

1. From the app settings page in Azure Portal, select "Authentication" under the Manage section
2. Scroll down to "Advanced settings"
3. Set "Allow public client flows" to **Yes**
4. Click "Save"

### App Permissions

1. From the app settings page in Azure Portal select the "API permissions" option under the Manage section
2. Click on "Add a permission"
3. Click on "Microsoft Graph"
4. Select "Delegated permissions"
5. Search for the following permissions and select the checkbox next to each one
    - offline_access (required for token refresh)
    - User.Read
    - Mail.Read
    - Mail.ReadWrite
    - Mail.Send
    - Calendars.Read
    - Calendars.ReadWrite
6. Click on "Add permissions"

### Client Secret (Optional)

For public client apps using device code flow, a client secret is **optional**. However, if you need it for other purposes:

1. From the app settings page in Azure Portal select the "Certificates & secrets" option under the Manage section
2. Switch to the "Client secrets" tab
3. Click on "New client secret"
4. Enter a description, for example "Client Secret"
5. Select the longest possible expiration time
6. Click on "Add"
7. Copy the secret **VALUE** (not the Secret ID)

## Configuration

### 1. Environment Variables

Create a `.env` file in the project root by copying the example:

```bash
cp .env.example .env
```

Edit `.env` and add your Azure client ID:

```bash
# Get these values from Azure Portal > App Registrations > Your App
MS_CLIENT_ID=your-application-client-id-here
# Client secret is optional for device code flow
# MS_CLIENT_SECRET=your-client-secret-VALUE-here
USE_TEST_MODE=false
```

### 2. Claude Desktop Configuration

Copy the configuration from `claude-config-sample.json` to your Claude Desktop config file and update the paths and credentials:

```json
{
  "mcpServers": {
    "outlook-assistant": {
      "command": "node",
      "args": [
        "/absolute/path/to/outlook-mcp/index.js"
      ],
      "env": {
        "USE_TEST_MODE": "false",
        "OUTLOOK_CLIENT_ID": "your-client-id-here"
      }
    }
  }
}
```

### 3. Advanced Configuration (Optional)

To configure server behavior, you can edit `config.js` to change:

- Server name and version
- Test mode settings
- Authentication parameters
- Email field selections
- API endpoints

## Usage with Claude Desktop

1. **Configure Claude Desktop**: Add the server configuration (see Configuration section above)
2. **Restart Claude Desktop**: Close and reopen Claude Desktop to load the new MCP server
3. **Authenticate**: In Claude Desktop, use the `authenticate` tool to get a device code
4. **Complete Authentication**:
   - Visit https://microsoft.com/devicelogin in your browser
   - Enter the code provided by the authenticate tool
   - Sign in with your Microsoft account
   - Run the `complete-auth` tool in Claude to finish authentication
5. **Start Using**: Once authenticated, you can use all the Outlook tools in Claude!

## Running Standalone

You can test the server using:

```bash
npm run inspect
```

This will use the MCP Inspector to directly connect to the server and let you test the available tools.

## Authentication Flow (Device Code)

The server uses OAuth 2.0 device code flow, which doesn't require running a separate authentication server:

### How It Works

1. **Request Device Code**: Use the `authenticate` tool in Claude
   - Returns a user code and verification URL (microsoft.com/devicelogin)

2. **User Authorization**: Visit the URL in any browser
   - Enter the device code
   - Sign in with your Microsoft account
   - Grant the requested permissions

3. **Complete Authentication**: Use the `complete-auth` tool in Claude
   - Polls Microsoft for the token
   - Saves tokens automatically to `~/.msgraph/.outlook-mcp-tokens.json`

4. **Automatic Refresh**: Tokens are automatically refreshed when they expire
   - Requires `offline_access` permission
   - No user interaction needed for refresh

### Authentication Tools

- **`authenticate`**: Starts device code flow, returns code to enter at microsoft.com/devicelogin
- **`complete-auth`**: Completes authentication after user signs in via browser
- **`check-auth-status`**: Shows current authentication status and token expiry

## Troubleshooting

### Common Installation Issues

#### "Cannot find module '@modelcontextprotocol/sdk/server/index.js'"
**Solution**: Install dependencies first:
```bash
npm install
```

### Authentication Issues

#### "AADSTS7000218: The request body must contain the following parameter: 'client_assertion' or 'client_secret'"
**Root Cause**: Public client flows not enabled in Azure.

**Solution**:
1. Go to Azure Portal > App Registrations > Your App > Authentication
2. Scroll to "Advanced settings"
3. Set "Allow public client flows" to **Yes**
4. Click Save

#### Device code expired
**Root Cause**: You didn't complete authentication within the time limit (usually 15 minutes).

**Solution**:
1. Run `authenticate` again to get a new code
2. Complete the browser sign-in more quickly
3. Run `complete-auth` promptly after signing in

#### "Authentication required" after successful setup
**Root Cause**: Token may have expired or been corrupted.

**Solutions**:
1. Check if token file exists: `~/.msgraph/.outlook-mcp-tokens.json`
2. Try running `check-auth-status` to see token state
3. If corrupted, delete the token file and re-authenticate
4. Use `authenticate` with `force: true` to force re-authentication

### Configuration Issues

#### Server doesn't start in Claude Desktop
**Solutions**:
1. Check the absolute path in your Claude Desktop config
2. Ensure `OUTLOOK_CLIENT_ID` is set in Claude config
3. Restart Claude Desktop after config changes

#### Environment variables not loading
**Solutions**:
1. Ensure `.env` file exists in the project root
2. Use `MS_CLIENT_ID` in `.env`
3. Don't add quotes around values in `.env` file

### API and Runtime Issues

- **OData Filter Errors**: Check server logs for escape sequence issues
- **API Call Failures**: Look for detailed error messages in the response
- **Token Refresh Issues**: Delete `~/.msgraph/.outlook-mcp-tokens.json` and re-authenticate

### Getting Help

If you're still having issues:
1. Verify your Azure app registration settings match the documentation
2. Ensure you have the required Microsoft Graph API permissions
3. Check that "Allow public client flows" is enabled in Azure

## Extending the Server

To add more functionality:

1. Create new module directories (e.g., `calendar/`)
2. Implement tool handlers in separate files
3. Export tool definitions from module index files
4. Import and add tools to `TOOLS` array in `index.js`
