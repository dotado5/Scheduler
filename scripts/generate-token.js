const { google } = require('googleapis');
const http = require('http');
const url = require('url');

// ============================================================================
// Google OAuth Token Generator
// Run this script locally with: node scripts/generate-token.js
// Make sure you have set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file
// ============================================================================

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const PORT = 3001;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("❌ ERROR: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in your .env file.");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// We need calendar events scope to create events and generate meet links
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly'
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent', // Force consent prompt to guarantee a refresh token is returned
  scope: SCOPES,
});

console.log('==================================================================');
console.log(`⚠️ IMPORTANT: Before continuing, ensure that you have added`);
console.log(`   ${REDIRECT_URI}`);
console.log(`   to the "Authorized redirect URIs" in your Google Cloud Console.`);
console.log('==================================================================\n');
console.log('1. Open this URL in your browser:');
console.log('\n', authUrl, '\n');
console.log('2. Authorize the application. The browser will redirect back to this script automatically.');
console.log('==================================================================\n');
console.log(`Waiting for authorization on port ${PORT}...`);

const server = http.createServer(async (req, res) => {
  try {
    const qs = new url.URL(req.url, `http://localhost:${PORT}`).searchParams;
    const code = qs.get('code');

    if (code) {
      res.end('Authentication successful! You can close this window and check your terminal.');
      server.close();
      
      const { tokens } = await oauth2Client.getToken(code);
      console.log('\n✅ Successfully acquired tokens!');
      console.log('\nAdd this to your .env file:\n');
      console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log('\n(Note: The refresh token is only returned the first time you authorize. If it says undefined, you need to revoke access in your Google Account security settings and try again.)');
      process.exit(0);
    } else {
      res.end('Waiting for code...');
    }
  } catch (error) {
    res.end('Error occurred. Check terminal.');
    console.error('\n❌ Error retrieving access token:', error.message);
    process.exit(1);
  }
});

server.listen(PORT);
