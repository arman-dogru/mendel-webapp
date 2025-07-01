// server/controllers/chatController.js
const chatService = require('../services/chatService');

const handleChatInteraction = async (req, res, next) => {
    try {
        // The body will contain { contextType, contextData, chatHistory, userMessage }
        const payload = req.body;
        const aiResponse = await chatService.generateChatResponse(payload);
        res.json({ message: aiResponse });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    handleChatInteraction,
};