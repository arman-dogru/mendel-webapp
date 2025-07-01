// server/routes/chatRoutes.js
const express = require('express');
const { checkAuth } = require('../middleware/authMiddleware');
const chatController = require('../controllers/chatController');

const router = express.Router();

router.post('/interact', checkAuth, chatController.handleChatInteraction);

module.exports = router;