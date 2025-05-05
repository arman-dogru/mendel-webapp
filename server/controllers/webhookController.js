// server/controllers/webhookController.js
const githubAppService = require('../services/githubAppService');
const geminiService = require('../services/geminiService');
const { AppError } = require('../utils/errorHandler');

/**
 * Handles incoming GitHub webhook events.
 */
const handleGithubWebhook = async (req, res, next) => {
    const event = req.headers['x-github-event'];
    const deliveryId = req.headers['x-github-delivery']; // For logging

    // --- *** PARSE THE RAW BODY HERE *** ---
    let payload;
    try {
        // req.rawBody should contain the buffer thanks to the middleware in server.js
        if (!req.rawBody || !Buffer.isBuffer(req.rawBody)) {
            console.error(`Webhook Error: Missing or invalid rawBody buffer in controller. Delivery: ${deliveryId}. Type: ${typeof req.rawBody}`);
            // Respond 202 but log the internal error. Processing cannot continue.
            return res.status(202).send('Accepted (Internal Error: Missing raw body)');
        }
        payload = JSON.parse(req.rawBody.toString('utf-8'));
        // console.log(`Webhook payload parsed successfully. Event: ${event}, Delivery: ${deliveryId}`); // Optional debug log
    } catch (parseError) {
        console.error(`Webhook Error: Failed to parse JSON payload for delivery ${deliveryId}:`, parseError);
        // Respond 202 but log the parse error. Processing cannot continue.
        return res.status(202).send('Accepted (Internal Error: Invalid JSON payload)');
    }
    // --- *** END PARSE *** ---


    // Respond quickly to GitHub AFTER parsing is attempted, otherwise they might retry on error
    res.status(202).send('Accepted');

    // --- Process Pull Request Events (using the parsed 'payload' object) ---
    try {
        if (event === 'pull_request') {
            const action = payload.action;
            const pr = payload.pull_request;
            const repo = payload.repository;
            const installationId = payload.installation?.id;

            // Log basic info using parsed payload
            console.log(`Webhook: Processing Pull Request event - Action: ${action}, PR #${pr?.number} in ${repo?.full_name}, Installation ID: ${installationId}`);

            // Only act on relevant actions
            if (action === 'opened' || action === 'synchronize') {
                if (!installationId) {
                    console.error(`Webhook Error: Missing installation ID for PR #${pr?.number} in ${repo?.full_name}. Payload:`, JSON.stringify(payload, null, 2));
                    return; // Already sent 202
                }
                // Optional: Check if PR exists and is not draft before processing
                 if (!pr || pr.draft) {
                     console.log(`Webhook: Skipping draft PR #${pr?.number} or invalid PR data.`);
                     return;
                 }

                 // Don't review PRs opened by the bot itself
                  // Adjust 'your-app-name[bot]' if your bot has a different username format
                 // const botUsername = "mendel-ai-github-assistant[bot]"; // Replace with your App's bot username
                 // if (pr.user?.type === 'Bot' && pr.user?.login === botUsername) {
                 //    console.log(`Webhook: Skipping PR #${pr.number} because it was opened/updated by the bot itself (${pr.user?.login}).`);
                 //    return;
                 // }

                // Process the review asynchronously
                // No 'await' here, let it run in the background after sending 202
                processCodeReview(installationId, repo.owner.login, repo.name, pr.number, pr.head.sha)
                    .catch(processingError => {
                         // Catch errors specifically from the async processCodeReview function
                         console.error(`Webhook Error: Background processing failed for PR #${pr?.number}. Delivery: ${deliveryId}`, processingError);
                         // Log error, maybe send notification if critical
                         // Cannot send response here as it's already sent.
                    });

            } else {
                console.log(`Webhook: Ignoring pull_request action '${action}' for PR #${pr?.number}.`);
            }
        } else {
            console.log(`Webhook: Ignoring event type '${event}'. Delivery: ${deliveryId}`);
        }
    } catch (controllerError) {
        // Catch synchronous errors within this handler (e.g., accessing payload before check)
         console.error(`Webhook Error: Synchronous error in handleGithubWebhook for delivery ${deliveryId}:`, controllerError);
         // Cannot send response here.
    }
    // No next() needed, response already sent
};

// processCodeReview and postComment functions remain the same as before...

/**
 * Asynchronous function to perform the code review process.
 */
async function processCodeReview(installationId, owner, repo, prNumber, commitSha) {
    console.log(`Processing review for ${owner}/${repo} PR #${prNumber} (Commit: ${commitSha?.substring(0, 7)})...`);

    try {
        if (!geminiService.isGeminiAvailable) {
            console.warn(`Skipping review for PR #${prNumber}: Gemini service is not available (API key missing?).`);
            await postComment(installationId, owner, repo, prNumber, "⚠️ Code review could not be performed: AI service is unavailable.", commitSha);
            return;
        }

        const octokit = await githubAppService.getInstallationOctokit(installationId);

        // 1. Fetch the PR diff
        console.log(`Fetching diff for PR #${prNumber}...`);
        const diffResponse = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
            owner,
            repo,
            pull_number: prNumber,
            headers: {
                accept: 'application/vnd.github.v3.diff'
            }
        });
        // Ensure diffResponse.data is actually the diff string
        const diff = typeof diffResponse.data === 'string' ? diffResponse.data : '';

        if (!diff || diff.length === 0) {
             console.log(`No diff content found or diff is not a string for PR #${prNumber}. Skipping review.`);
             // Maybe post a comment? Depends on desired behavior.
             // await postComment(installationId, owner, repo, prNumber, "⚠️ Could not retrieve pull request changes to review.", commitSha);
             return;
        }

         const MAX_DIFF_SIZE = 500000; // 500KB example limit
         if (diff.length > MAX_DIFF_SIZE) {
             console.warn(`Diff for PR #${prNumber} is very large (${(diff.length / 1024).toFixed(1)} KB). Skipping review.`);
              await postComment(installationId, owner, repo, prNumber, `⚠️ Code review skipped: Pull request diff is too large (${(diff.length / 1024).toFixed(1)} KB). Review manually.`, commitSha);
             return;
         }

        // 2. Prepare prompt for Gemini
        const reviewPrompt = `
You are an AI code reviewer integrated into a GitHub App.
Review the following pull request diff for potential issues. Focus on:
- Bugs and logic errors
- Security vulnerabilities
- Performance concerns
- Code smells and bad practices
- Readability and maintainability improvements
- Non-compliance with common best practices for the language(s) involved.

**Output Format:**
- Provide a concise summary of your findings (1-2 sentences).
- List specific issues using markdown bullet points.
- For each issue:
    - Briefly describe the problem.
    - Suggest a fix or improvement.
    - Reference the relevant file(s) and approximate line number(s) from the diff if possible (e.g., \`path/to/file.js#L10-L15\`). If the exact line is unclear from the diff context, just mention the file.
- If no significant issues are found, state that clearly (e.g., "No major issues identified. LGTM!").
- Be constructive and objective.
- Respond ONLY with the review content in Markdown format. Do not include any introductory or concluding remarks like "Here is the review:" or "Let me know if you have questions."

**Pull Request Diff:**
\`\`\`diff
${diff}
\`\`\`
`;

        // 3. Call Gemini API
        console.log(`Requesting Gemini review for PR #${prNumber}...`);
        const reviewContent = await geminiService.generateContent(reviewPrompt);
        console.log(`Gemini review received for PR #${prNumber}. Length: ${reviewContent?.length || 0}`);

        if (!reviewContent || reviewContent.trim().length === 0) {
            console.warn(`Gemini returned empty review for PR #${prNumber}.`);
            await postComment(installationId, owner, repo, prNumber, "⚠️ AI code review completed but returned no content.", commitSha);
            return;
        }

        // 4. Post the review as a comment
        const commentBody = `**🤖 AI Code Review** (Commit: \`${commitSha?.substring(0, 7)}\`):\n\n${reviewContent}`;
        await postComment(installationId, owner, repo, prNumber, commentBody, commitSha); // Pass commitSha to postComment

        console.log(`Successfully posted review comment to PR #${prNumber} in ${owner}/${repo}.`);

    } catch (error) {
        console.error(`Error during processCodeReview for ${owner}/${repo} PR #${prNumber}:`, error);
        // Attempt to post an error comment to the PR
        try {
            const errorMessage = `⚠️ An error occurred during AI code review (Commit: \`${commitSha?.substring(0, 7)}\`): ${error.message || 'Unknown error'}`;
             await postComment(installationId, owner, repo, prNumber, errorMessage, commitSha); // Pass commitSha
        } catch (postError) {
            console.error(`Failed to post error comment to PR #${prNumber}:`, postError);
        }
    }
}

/**
 * Helper to post a comment to a PR using installation auth.
 */
async function postComment(installationId, owner, repo, issueNumber, body, commitSha = null) { // Added commitSha for context
     const MAX_COMMENT_LENGTH = 65536; // GitHub comment limit
     let truncatedBody = body;

     if (typeof body !== 'string') {
         console.error(`Error: Invalid comment body type (${typeof body}) for PR #${issueNumber}. Defaulting message.`);
         truncatedBody = `⚠️ Internal error: Attempted to post invalid comment content (Commit: ${commitSha?.substring(0, 7) || 'N/A'}).`;
     } else if (body.length > MAX_COMMENT_LENGTH) {
         console.warn(`Comment body for PR #${issueNumber} exceeds GitHub limit (${body.length} > ${MAX_COMMENT_LENGTH}). Truncating.`);
         const truncationMessage = `\n\n... (Comment truncated due to length limit. Full review might be available in server logs.)`;
         truncatedBody = body.substring(0, MAX_COMMENT_LENGTH - truncationMessage.length) + truncationMessage;
     }

    try {
        console.log(`Attempting to post comment to ${owner}/${repo}#${issueNumber}...`);
        const octokit = await githubAppService.getInstallationOctokit(installationId);
        const response = await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
            owner,
            repo,
            issue_number: issueNumber,
            body: truncatedBody
        });
        console.log(`Successfully posted comment to ${owner}/${repo}#${issueNumber}. Comment ID: ${response.data.id}`);
    } catch (error) {
         console.error(`Failed to post comment to ${owner}/${repo}#${issueNumber}: [${error.status}] ${error.message}`, error.response?.data);
         // Rethrow or handle as needed - Rethrowing allows the caller (processCodeReview's catch block) to know posting failed.
         throw error;
    }
}


module.exports = {
    handleGithubWebhook,
};