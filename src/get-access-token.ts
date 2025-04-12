#!/usr/bin/env node

import fetch from 'node-fetch';
import { URLSearchParams } from 'url';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import http from 'http';
import { URL } from 'url';
// We'll use dynamic import for 'open' to avoid ESM/CommonJS issues

// Constants
const OAUTH_BASE_URL = 'https://dida365.com/oauth';
const CONFIG_FILE = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.dida-mcp-config.json');
const REDIRECT_URI = 'http://localhost:3000/oauth/callback';
const PORT = 3000;

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to prompt for input
function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Function to get authorization code using a local HTTP server
async function getAuthorizationCode(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Create a server to listen for the OAuth callback
    const server = http.createServer(async (req, res) => {
      try {
        if (req.url?.startsWith('/oauth/callback')) {
          // Parse the URL to extract the authorization code
          const url = new URL(req.url, `http://localhost:${PORT}`);
          const code = url.searchParams.get('code');

          if (code) {
            // Send a success response to the browser
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <head>
                  <style>
                    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                    h1 { color: #2c974b; }
                    .config { background: #f6f8fa; padding: 15px; border-radius: 6px; overflow-x: auto; }
                    code { font-family: monospace; }
                    button { background: #2c974b; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
                    button:hover { background: #22863a; }
                    .processing { text-align: center; margin: 40px 0; }
                  </style>
                </head>
                <body>
                  <div class="processing">
                    <h1>Authorization Successful</h1>
                    <p>Processing your token... Please wait.</p>
                  </div>
                  <script>window.close();</script>
                </body>
              </html>
            `);

            // Close the server and resolve the promise with the code
            server.close();
            resolve(code);
          } else {
            // No code found in the callback URL
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <body>
                  <h1>Authorization Failed</h1>
                  <p>No authorization code was received. Please try again.</p>
                </body>
              </html>
            `);
            reject(new Error('No authorization code received'));
          }
        } else {
          // Unexpected URL path
          res.writeHead(404);
          res.end();
        }
      } catch (error) {
        console.error('Error handling callback:', error);
        res.writeHead(500);
        res.end('Internal Server Error');
        reject(error);
      }
    });

    // Start the server
    server.listen(PORT, async () => {
      const authUrl = `${OAUTH_BASE_URL}/authorize?client_id=${clientId}&response_type=code&scope=tasks:read%20tasks:write&redirect_uri=${REDIRECT_URI}`;

      console.log(`\nStarting local server on port ${PORT} to receive the authorization code...`);
      console.log(`\nOpening browser to authorize the application...`);
      console.log(`\nIf the browser doesn't open automatically, please open the following URL:`);
      console.log(`\n${authUrl}\n`);

      // Open the authorization URL in the default browser
      try {
        // Dynamically import the 'open' package
        const openModule = await import('open');
        const open = openModule.default;
        await open(authUrl);
      } catch (error) {
        console.log(`\nFailed to open browser automatically. Please open the URL manually.`);
      }
    });

    // Handle server errors
    server.on('error', (error) => {
      console.error(`\nServer error: ${error.message}`);
      if ((error as any).code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please close any other applications using this port and try again.`);
      }
      reject(error);
    });
  });
}

// Function to exchange authorization code for access token
async function getAccessToken(clientId: string, clientSecret: string, code: string): Promise<any> {
  const params = new URLSearchParams();
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('code', code);
  params.append('grant_type', 'authorization_code');
  params.append('redirect_uri', REDIRECT_URI);

  const response = await fetch(`${OAUTH_BASE_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get access token: ${response.status} ${response.statusText}\n${errorText}`);
  }

  return await response.json();
}

// Function to save token to config file
function saveTokenToConfig(tokenData: any): { config: any, expirationDate: Date } {
  const expiresAt = Date.now() + (tokenData.expires_in * 1000);
  const expirationDate = new Date(expiresAt);

  const config = {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: expiresAt,
    token_type: tokenData.token_type
  };

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  console.log(`\nToken saved to ${CONFIG_FILE}`);

  return { config, expirationDate };
}

// Function to display success page with token info and MCP config
function displaySuccessPage(tokenData: any, expirationDate: Date): Promise<void> {
  return new Promise((resolve) => {
    // Get the absolute path to the dida-mcp-server directory
    const currentDir = process.cwd();

    // Create a server to display the success page
    const server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });

      // Format the expiration date
      const formattedDate = expirationDate.toLocaleString();

      // Create the MCP server configuration
      const mcpConfig = {
        mcpServers: {
          dida: {
            command: "node",
            args: [
              path.join(currentDir, "build/index.js")
              // No longer need --token-auth flag as the server automatically detects the token file
            ]
          }
        }
      };

      const mcpConfigJson = JSON.stringify(mcpConfig, null, 2);

      res.end(`
        <html>
          <head>
            <title>TickTick Authorization Successful</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
              h1 { color: #2c974b; }
              .config { background: #f6f8fa; padding: 15px; border-radius: 6px; overflow-x: auto; margin: 20px 0; }
              code { font-family: monospace; }
              button { background: #2c974b; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
              button:hover { background: #22863a; }
              .success { margin: 20px 0; }
              .token-info { margin: 20px 0; }
              .copy-button { margin-top: 10px; }
            </style>
          </head>
          <body>
            <h1>Authorization Successful</h1>

            <div class="success">
              <p>Your TickTick access token has been successfully obtained and saved.</p>
            </div>

            <div class="token-info">
              <h2>Token Information</h2>
              <p><strong>Access Token:</strong> ${tokenData.access_token.substring(0, 10)}...</p>
              <p><strong>Token Type:</strong> ${tokenData.token_type}</p>
              <p><strong>Expires In:</strong> ${tokenData.expires_in} seconds</p>
              <p><strong>Expiration Date:</strong> ${formattedDate}</p>
            </div>

            <div>
              <h2>MCP Server Configuration</h2>
              <p>Copy the following configuration to your MCP client's configuration file:</p>

              <div class="config">
                <pre><code>${mcpConfigJson}</code></pre>
              </div>

              <button class="copy-button" onclick="copyConfig()">Copy Configuration</button>
            </div>

            <div style="margin-top: 30px;">
              <p>To use this token with the MCP server, run:</p>
              <div class="config">
                <code>npm run start</code>
              </div>
              <p>The server will automatically detect and use your token.</p>
            </div>

            <script>
              function copyConfig() {
                const configText = document.querySelector('.config pre code').textContent;
                navigator.clipboard.writeText(configText)
                  .then(() => {
                    alert('Configuration copied to clipboard!');
                  })
                  .catch(err => {
                    console.error('Failed to copy: ', err);
                    alert('Failed to copy. Please select and copy manually.');
                  });
              }
            </script>
          </body>
        </html>
      `);

      // Close the server after the page is loaded
      server.close(() => {
        resolve();
      });
    });

    // Start the server on a different port
    const successPort = PORT + 1;
    server.listen(successPort, async () => {
      console.log(`\nOpening browser to display token information...`);
      try {
        // Dynamically import the 'open' package
        const openModule = await import('open');
        const open = openModule.default;
        await open(`http://localhost:${successPort}`);
      } catch (error) {
        console.log(`\nFailed to open browser automatically. Please open http://localhost:${successPort} manually.`);
      }
    });
  });
}

// Note: You may see a punycode deprecation warning when running this script.
// This is from a Node.js internal module being deprecated and is used by dependencies.
// It doesn't affect functionality and can be safely ignored.

// Main function
async function main() {
  try {
    console.log('TickTick OAuth Access Token Generator');
    console.log('====================================\n');

    const clientId = await prompt('Enter your Client ID: ');
    const clientSecret = await prompt('Enter your Client Secret: ');

    console.log('\nStarting OAuth authorization flow...');

    const authCode = await getAuthorizationCode(clientId);
    console.log(`\nAuthorization code received: ${authCode.substring(0, 5)}...`);

    console.log('\nExchanging authorization code for access token...');
    const tokenData = await getAccessToken(clientId, clientSecret, authCode);

    const { expirationDate } = saveTokenToConfig(tokenData);

    console.log('\nAccess token obtained successfully!');
    console.log(`\nToken details:`);
    console.log(`- Access token: ${tokenData.access_token.substring(0, 10)}...`);
    console.log(`- Token type: ${tokenData.token_type}`);
    console.log(`- Expires in: ${tokenData.expires_in} seconds`);
    console.log(`- Expires on: ${expirationDate.toLocaleString()}`);

    console.log(`\nOpening browser to display token information and MCP configuration...`);
    await displaySuccessPage(tokenData, expirationDate);

    console.log(`\nTo use this token with the MCP server, run:`);
    console.log(`npm run start`);
    console.log(`The server will automatically detect and use your token.`);

    rl.close();
  } catch (error) {
    console.error(`\nError: ${error instanceof Error ? error.message : String(error)}`);
    rl.close();
    process.exit(1);
  }
}

// Run the main function
main();
