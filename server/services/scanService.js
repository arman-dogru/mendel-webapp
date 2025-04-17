// services/scanService.js
const githubService = require("./githubService");
const geminiService = require("./geminiService");
const { AppError } = require("../utils/errorHandler");

// --- Configuration (Keep as before) ---
const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB limit per file
// We might not need MAX_TOTAL_CONTENT_CHARS anymore if we don't summarize
const MAX_FILES_TO_ANALYZE = 100; // Limit number of files analyzed
const RELEVANT_EXTENSIONS = new Set([
    '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cs', '.go', '.rb', '.php',
    '.html', '.css', '.scss', '.less', '.vue', '.svelte',
    '.json', '.yaml', '.yml', '.md', // Keep config/docs for now, might reveal issues
    'dockerfile', 'makefile',
    '.sh', '.bash',
    '.sql'
]);
const EXCLUDED_DIRS = new Set([
    'node_modules', '.git', 'dist', 'build', 'out', 'coverage', 'vendor',
    '.vscode', '.idea', '.github',
    '__pycache__', '.pytest_cache',
    'target', 'bin', 'obj'
]);
const EXCLUDED_FILES = new Set([
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
    '.env'
]);
// Increase snippet size slightly for more context, adjust based on performance/cost
const MAX_SNIPPET_SIZE = 5000;


function isRelevantFile(filePath, fileSize) {
    // (Keep this function as before)
    if (!filePath || EXCLUDED_FILES.has(filePath.toLowerCase())) {
        return false;
    }
    if (fileSize > MAX_FILE_SIZE_BYTES) {
        console.log(`Skipping large file: ${filePath} (${(fileSize / 1024).toFixed(1)} KB)`);
        return false;
    }
    const parts = filePath.split('/');
    if (parts.some(part => EXCLUDED_DIRS.has(part.toLowerCase()))) {
        return false;
    }
    const extension = parts[parts.length - 1].includes('.')
        ? '.' + parts[parts.length - 1].split('.').pop().toLowerCase()
        : parts[parts.length - 1].toLowerCase();
    return RELEVANT_EXTENSIONS.has(extension);
}

async function analyzeRepository(owner, repo, accessToken) {
    if (!geminiService.isGeminiAvailable) {
        throw new AppError(
            "Gemini API key not configured. Analysis unavailable.",
            503
        );
    }

    console.log(`Starting analysis for ${owner}/${repo}`);
    let defaultBranch;
    try {
        defaultBranch = await githubService.getRepoDefaultBranch(owner, repo, accessToken);
        console.log(`Default branch: ${defaultBranch}`);
    } catch (error) {
        throw new AppError(`Failed to get default branch for ${owner}/${repo}: ${error.message}`, error.statusCode || 500);
    }

    let tree;
    try {
        tree = await githubService.getRepoTree(owner, repo, defaultBranch, accessToken);
        console.log(`Fetched tree with ${tree.length} items.`);
    } catch (error) {
        throw new AppError(`Failed to get repository tree for ${owner}/${repo}: ${error.message}`, error.statusCode || 500);
    }

    const relevantFiles = tree
        .filter(item => item.type === 'blob' && isRelevantFile(item.path, item.size))
        .slice(0, MAX_FILES_TO_ANALYZE);

    console.log(`Found ${relevantFiles.length} relevant files to analyze (up to ${MAX_FILES_TO_ANALYZE}).`);

    if (relevantFiles.length === 0) {
        return "## Code Quality Analysis Report\n\nNo relevant code files found to analyze in this repository based on current filters (file extensions, excluded directories, size limits).";
    }

    const fileAnalyses = []; // Store Markdown results for each file
    let filesAnalyzedCount = 0;
    let filesSkippedCount = 0;
    let filesErroredCount = 0;

    for (const file of relevantFiles) {
        console.log(`Processing file: ${file.path}`);
        let content;
        try {
            content = await githubService.getFileContent(owner, repo, file.sha, accessToken);
            if (content === null) {
                console.log(`Skipping content fetch for ${file.path} (likely size or transient issue).`);
                filesSkippedCount++;
                fileAnalyses.push(`### File: \`${file.path}\`\n\n*   Analysis skipped (Could not retrieve content, possibly too large or removed).*`);
                continue;
            }
        } catch (error) {
            console.error(`Error fetching content for ${file.path}: ${error.message}`);
            filesErroredCount++;
            fileAnalyses.push(`### File: \`${file.path}\`\n\n*   **Error:** Failed to fetch content - ${error.message}`);
            continue; // Skip analysis if content fetch fails
        }

        // Basic check to skip binary-like content
        if (content.includes('\uFFFD')) {
            console.log(`Skipping potentially binary file: ${file.path}`);
            filesSkippedCount++;
             fileAnalyses.push(`### File: \`${file.path}\`\n\n*   Analysis skipped (Detected potentially non-text content).*`);
            continue;
        }

        // --- Refined Prompt for Code Quality ---
        const fileAnalysisPrompt = `Act as an expert code reviewer for the file \`${file.path}\`. Analyze the following code snippet strictly for code quality issues.

Focus specifically on identifying:
*   **Code Smells:** Long methods/classes, feature envy, inappropriate intimacy, excessive comments, duplicated code, etc.
*   **Bad Practices:** Magic numbers/strings, deep nesting, mutable globals, improper error handling (e.g., empty catch blocks), blocking operations in async contexts.
*   **Potential Bugs:** Off-by-one errors, null pointer risks, resource leaks (if apparent), race conditions (if apparent).
*   **Security Vulnerabilities:** Potential XSS vectors, injection points (SQL, command), hardcoded secrets/credentials, insecure cryptographic practices, weak access control logic (if apparent).
*   **Performance Issues:** Obvious inefficient loops, unnecessary computations inside loops, potentially blocking I/O calls.
*   **Readability/Maintainability:** Poor naming, lack of comments for complex logic, overly complex conditions, inconsistent styling (if egregious).
*   **Potential Dead Code:** Unreachable code blocks or unused variables/functions (if identifiable from the snippet).

**Instructions:**
*   List findings as concise Markdown bullet points (*).
*   For each finding, briefly explain the issue and *why* it's a concern.
*   If possible, suggest a brief improvement or reference the problematic pattern.
*   Indicate a potential severity (e.g., [Severity: High], [Severity: Medium], [Severity: Low]) based on impact and likelihood.
*   If no significant issues are found in the snippet, state "No major code quality issues identified in this snippet."
*   Do **not** describe the file's overall purpose or provide a general summary of the file. Focus *only* on code quality problems.

Code Snippet (\`${file.path}\`):
\`\`\`
${content.substring(0, MAX_SNIPPET_SIZE)}
\`\`\`
`;
        // --- End Refined Prompt ---


        try {
            // Call Gemini service (already rate-limited)
            const analysisResult = await geminiService.generateContent(fileAnalysisPrompt);
            fileAnalyses.push(`### File: \`${file.path}\`\n\n${analysisResult}`);
            filesAnalyzedCount++;
        } catch (error) {
            console.error(`Error analyzing ${file.path} with Gemini: ${error.message}`);
            filesErroredCount++;
            fileAnalyses.push(`### File: \`${file.path}\`\n\n*   **Error:** Analysis failed - ${error.message}`);
            // Propagate critical errors like rate limits or auth failures
            if (error.statusCode === 429 || error.statusCode === 401 || error.statusCode === 403) {
                 throw error;
             }
        }

        // Bottleneck handles rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log("Constructing final report...");

    // --- Direct Report Construction (No Final Gemini Call) ---
    const reportHeader = `# Code Quality Analysis Report for ${owner}/${repo}\n\n` +
        `**Disclaimer:** This is an automated analysis using Google Gemini based on code snippets. Findings may require manual verification and context. Analysis is limited to ${MAX_FILES_TO_ANALYZE} relevant files.\n\n` +
        `**Summary:** Analyzed ${filesAnalyzedCount} files, skipped ${filesSkippedCount} files (size/content/binary), encountered errors on ${filesErroredCount} files.\n\n` +
        `---\n\n`;

    const reportBody = fileAnalyses.join('\n\n---\n\n'); // Join individual file results

    const finalReport = reportHeader + reportBody;
     // --- End Direct Report Construction ---

    console.log(`Analysis complete for ${owner}/${repo}`);
    return finalReport; // Return the directly constructed report
}

module.exports = {
    analyzeRepository,
};