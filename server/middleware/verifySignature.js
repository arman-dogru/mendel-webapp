// server/middleware/verifySignature.js
const crypto = require('crypto');
const { GITHUB_WEBHOOK_SECRET } = require('../config/env');
const { AppError } = require('../utils/errorHandler');

/**
 * Middleware to verify the signature of incoming GitHub webhook requests.
 */
const verifyGitHubSignature = (req, res, next) => {
    if (!GITHUB_WEBHOOK_SECRET) {
        console.warn("GITHUB_WEBHOOK_SECRET not set. Skipping signature verification. THIS IS INSECURE!");
        return next();
    }

    const signatureHeader = req.headers['x-hub-signature-256'];
    if (!signatureHeader) {
        console.warn("Webhook received without x-hub-signature-256 header.");
        return next(new AppError('Missing GitHub signature', 400));
    }

    // Ensure we have the raw body buffer
    if (!req.rawBody) {
         console.error("Raw body (req.rawBody) is missing. Ensure 'express.raw()' middleware runs before this for the webhook route.");
         return next(new AppError('Internal server configuration error: raw body missing', 500));
    }

    const signature = signatureHeader.split('=')[1]; // Format is sha256=<signature>
    const expectedSignature = crypto
        .createHmac('sha256', GITHUB_WEBHOOK_SECRET)
        .update(req.rawBody) // Use the raw buffer
        .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        console.warn("Invalid webhook signature received.");
        return next(new AppError('Invalid GitHub signature', 403));
    }

    // console.log("Webhook signature verified successfully.");
    next();
};

module.exports = { verifyGitHubSignature };