// server/services/chatService.js
const geminiService = require('./geminiService');
const { AppError } = require('../utils/errorHandler');

/**
 * Builds a prompt for Gemini when chatting about a specific code issue.
 */
const buildIssueChatPrompt = (issue, file, history, userMessage) => {
    const prompt = `
You are an expert AI programming assistant integrated into a code analysis tool. A developer is asking for help with a specific issue you previously identified. Your goal is to be helpful, concise, and provide actionable advice.

**CONTEXT OF THE ISSUE:**
- **File:** \`${file.filePath}\`
- **Category:** ${issue.category}
- **Severity:** ${issue.severity}
- **Line:** ${issue.line || 'N/A'}
- **Initial Description:** ${issue.description}
- **Initial Explanation:** ${issue.explanation}
- **Initial Suggestion:** ${issue.suggestion}
- **Code Snippet:**
  \`\`\`
  ${issue.code_snippet || 'No snippet available.'}
  \`\`\`

**CONVERSATION HISTORY:**
${history.map(msg => `${msg.sender === 'user' ? 'Developer' : 'You'}: ${msg.message}`).join('\n')}

**DEVELOPER'S NEW QUESTION:**
Developer: ${userMessage}

**YOUR TASK:**
Based on all the context above, provide a helpful and direct response to the developer's question. Address their query specifically. If they ask for an alternative, provide one. If they ask for clarification, explain it in simpler terms.
Your response should be just your message, without any prefixes like "You:" or "AI:".
`;
    return prompt;
};

/**
 * Builds a prompt for Gemini when chatting about a pull request.
 */

const buildPRChatPrompt = (pr, history, userMessage) => {
    const prompt = `
You are an expert AI programming assistant...

**CONTEXT OF THE PULL REQUEST:**
- **PR Title:** "${pr.title}"
- **PR Author:** ${pr.author}
- **Description:**
  \`\`\`
  ${pr.body || 'No description provided.'}
  \`\`\`

// --- ADD THE DIFF CONTEXT ---
**PULL REQUEST DIFF:**
  \`\`\`diff
  ${pr.diff || 'No diff available.'}
  \`\`\`
// --- END OF DIFF CONTEXT ---

**CONVERSATION HISTORY:**
${history.map(msg => `${msg.sender === 'user' ? 'Developer' : 'You'}: ${msg.message}`).join('\n')}

**DEVELOPER'S NEW QUESTION:**
Developer: ${userMessage}

**YOUR TASK:**
Based on all the context above... your primary task is to explain the code changes and purpose of this pull request.
`;
    return prompt;
};

/**
 * Generates a chat response by selecting the correct prompt and calling the Gemini service.
 */
const generateChatResponse = async (payload) => {
    const { contextType, contextData, chatHistory, userMessage } = payload;

    if (!geminiService.isGeminiAvailable) {
        throw new AppError("AI service is not available.", 503);
    }

    let prompt;
    if (contextType === 'issue') {
        const { issue, file } = contextData;
        if (!issue || !file) throw new AppError("Issue context data is missing.", 400);
        prompt = buildIssueChatPrompt(issue, file, chatHistory, userMessage);
    } else if (contextType === 'pr') {
        const { pr } = contextData;
        if (!pr) throw new AppError("PR context data is missing.", 400);
        prompt = buildPRChatPrompt(pr, chatHistory, userMessage);
    } else {
        throw new AppError("Invalid chat context type.", 400);
    }

    const aiResponse = await geminiService.generateContent(prompt);
    return aiResponse;
};


module.exports = {
    generateChatResponse,
};