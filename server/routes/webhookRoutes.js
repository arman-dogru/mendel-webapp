// server/routes/webhookRoutes.js
const express = require('express');
const webhookController = require('../controllers/webhookController');
const { verifyGitHubSignature } = require('../middleware/verifySignature'); // Import the middleware

const router = express.Router();

// IMPORTANT: Apply signature verification BEFORE the main handler
// The raw body parser needs to run *before* this route is processed in server.js
router.post(
    '/github',
    verifyGitHubSignature, // Verify signature first
    webhookController.handleGithubWebhook // Then handle the event
);

module.exports = router;