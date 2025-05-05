// config/env.js
require("dotenv").config();
const fs = require('fs');
const path = require('path');

// Function to decode Base64 or read multiline key
function getPrivateKey() {
    if (process.env.GITHUB_PRIVATE_KEY_BASE64) {
        console.log("Decoding GitHub Private Key from Base64 ENV variable...");
        return Buffer.from(process.env.GITHUB_PRIVATE_KEY_BASE64, 'base64').toString('utf-8');
    } else if (process.env.GITHUB_PRIVATE_KEY) {
         console.log("Using GitHub Private Key directly from ENV variable...");
        // Replace literal '\n' with actual newlines if needed, depending on how it's stored/loaded
        return process.env.GITHUB_PRIVATE_KEY.replace(/\\n/g, '\n');
    }
    // Optional: Fallback to reading from a file if needed
    // const keyPath = path.join(__dirname, '..', 'path-to-your-key.pem');
    // if (fs.existsSync(keyPath)) {
    //     console.log(`Reading GitHub Private Key from file: ${keyPath}`);
    //     return fs.readFileSync(keyPath, 'utf8');
    // }
    console.error("FATAL ERROR: GitHub Private Key not found in environment variables (GITHUB_PRIVATE_KEY_BASE64 or GITHUB_PRIVATE_KEY).");
    process.exit(1);
}


module.exports = {
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
  CALLBACK_URL: process.env.CALLBACK_URL,
  FRONTEND_URL: process.env.FRONTEND_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  PORT: process.env.PORT,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  MONGODB_URI: process.env.MONGODB_URI,
  // --- GitHub App & Webhook ---
  GITHUB_APP_ID: process.env.GITHUB_APP_ID,
  GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET,
  GITHUB_PRIVATE_KEY: getPrivateKey(), // Use the helper function
};