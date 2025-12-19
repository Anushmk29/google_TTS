const { google } = require('googleapis');
const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const PORT = 3001;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in your .env file.');
    process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

const app = express();

const scopes = [
    'https://www.googleapis.com/auth/cloud-platform'
];

app.get('/', (req, res) => {
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent'
    });
    res.redirect(url);
});

app.get('/oauth2callback', async (req, res) => {
    const { code } = req.query;
    try {
        const { tokens } = await oauth2Client.getToken(code);
        console.log('\nSuccess! Copy this Refresh Token to your .env file:\n');
        console.log('GOOGLE_REFRESH_TOKEN=' + tokens.refresh_token);
        console.log('\nThen restart your server.\n');
        res.send('<h1>Success!</h1><p>Check your terminal for the Refresh Token and copy it to your .env file.</p>');
        process.exit(0);
    } catch (error) {
        console.error('Error getting tokens:', error);
        res.send('<h1>Error</h1><p>' + error.message + '</p>');
    }
});

app.listen(PORT, async () => {
    const url = `http://localhost:${PORT}`;
    console.log(`\n1. Opening browser to: ${url}`);
    console.log('2. Click through the Google consent screens.');
    console.log('3. Your Refresh Token will appear here in the terminal.\n');

    try {
        const { default: open } = await import('open');
        await open(url);
    } catch (err) {
        console.log(`Please manually open: ${url}`);
    }
});
