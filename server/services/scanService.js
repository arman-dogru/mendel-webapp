// services/scanService.js
const githubService = require("./githubService");
const geminiService = require("./geminiService");
const { AppError } = require("../utils/errorHandler");

// --- Configuration (Keep as before) ---
const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB limit per file
const MAX_FILES_TO_ANALYZE = 100; // Limit number of files analyzed
const RELEVANT_EXTENSIONS = new Set([
    '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cs', '.go', '.rb', '.php',
    '.html', '.css', '.scss', '.less', '.vue', '.svelte',
    '.json', '.yaml', '.yml', '.md',
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
// Slightly smaller snippet for JSON focus, but still decent context
const MAX_SNIPPET_SIZE = 4000;

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
        : parts[parts.length - 1].toLowerCase(); // Handle files without extensions like 'Dockerfile'
    // Special check for extensionless files like Dockerfile, Makefile
    if (!parts[parts.length - 1].includes('.') && RELEVANT_EXTENSIONS.has(parts[parts.length - 1].toLowerCase())) {
        return true;
    }
    return RELEVANT_EXTENSIONS.has(extension);
}


// --- Define Expected JSON Structure ---
/*
Example Output for a single file analysis:
{
  "filePath": "src/utils/helpers.js",
  "status": "analyzed", // "analyzed", "skipped", "error"
  "summary": "Identified 1 potential bug and 2 readability issues.", // Brief LLM summary
  "issues": [
    {
      "category": "Potential Bug", // "Code Smell", "Bad Practice", "Potential Bug", "Security Vulnerability", "Performance Issue", "Readability", "Dead Code"
      "severity": "Medium", // "High", "Medium", "Low", "Informational"
      "description": "Potential null pointer risk if 'user.profile' is null.",
      "explanation": "Accessing 'user.profile.name' without checking if 'user.profile' exists can lead to runtime errors.",
      "suggestion": "Use optional chaining ('user.profile?.name') or add a null check.",
      "code_snippet": "const name = user.profile.name;" // Relevant snippet if possible
    },
    {
       "category": "Readability",
       "severity": "Low",
       "description": "Function 'procDat' has unclear naming.",
       "explanation": "Short, abbreviated names make the code harder to understand.",
       "suggestion": "Rename the function to something more descriptive, like 'processUserData'.",
       "code_snippet": "function procDat(data) { ... }"
    }
  ],
  "error_message": null, // Populated if status is "error"
  "skip_reason": null // Populated if status is "skipped"
}

If no issues are found:
{
  "filePath": "src/config/constants.js",
  "status": "analyzed",
  "summary": "No significant code quality issues identified in this snippet.",
  "issues": [],
  "error_message": null,
  "skip_reason": null
}

If skipped:
{
    "filePath": "large_file.bin",
    "status": "skipped",
    "summary": null,
    "issues": [],
    "error_message": null,
    "skip_reason": "File size exceeds limit"
}
*/

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
        // Return a structured response even if no files are analyzed
        return {
             summary: {
                 owner,
                 repo,
                 defaultBranch,
                 filesAnalyzed: 0,
                 filesSkipped: 0,
                 filesErrored: 0,
                 maxFilesAttempted: MAX_FILES_TO_ANALYZE,
                 message: "No relevant code files found to analyze based on current filters.",
             },
             fileAnalyses: []
         };
    }

    const fileAnalyses = []; // Store JSON results for each file
    let filesAnalyzedCount = 0;
    let filesSkippedCount = 0;
    let filesErroredCount = 0;

    const analysisPromises = relevantFiles.map(async (file) => {
        console.log(`Processing file: ${file.path}`);
        let content;
        try {
            content = await githubService.getFileContent(owner, repo, file.sha, accessToken);
            if (content === null) {
                console.log(`Skipping content fetch for ${file.path} (likely size or transient issue).`);
                return {
                    filePath: file.path,
                    status: "skipped",
                    summary: null,
                    issues: [],
                    error_message: null,
                    skip_reason: "Could not retrieve content (possibly too large, removed, or binary)."
                };
            }
        } catch (error) {
            console.error(`Error fetching content for ${file.path}: ${error.message}`);
            return {
                filePath: file.path,
                status: "error",
                summary: null,
                issues: [],
                error_message: `Failed to fetch content: ${error.message}`,
                skip_reason: null
            };
        }

        // Basic check to skip binary-like content
        if (content.includes('\uFFFD')) {
            console.log(`Skipping potentially binary file: ${file.path}`);
            return {
                filePath: file.path,
                status: "skipped",
                summary: null,
                issues: [],
                error_message: null,
                skip_reason: "Detected potentially non-text content."
            };
        }

        // --- New Prompt for JSON Output ---
        const fileAnalysisPrompt = `
Analyze the following code snippet from the file \`${file.path}\` for code quality issues.

Focus specifically on identifying:
*   Code Smells (e.g., Long Methods, Duplication)
*   Bad Practices (e.g., Magic Numbers, Deep Nesting)
*   Potential Bugs (e.g., Null Risks, Off-by-one)
*   Security Vulnerabilities (e.g., XSS hints, Hardcoded Secrets)
*   Performance Issues (e.g., Inefficient Loops)
*   Readability/Maintainability (e.g., Poor Naming, Complexity)
*   Potential Dead Code

**Output Format Instructions:**
*   Respond **ONLY** with a valid JSON object. Do **NOT** include any explanatory text before or after the JSON.
*   The JSON object should strictly follow this structure:
    \`\`\`json
    {
      "filePath": "string", // The file path provided (\`${file.path}\`)
      "status": "analyzed", // Always "analyzed" if successful
      "summary": "string", // A brief one-sentence summary of findings (e.g., "Found 2 medium issues.", "No major issues found.")
      "issues": [ // An array of issue objects. Empty array ([]) if no issues found.
        {
          "category": "string", // Must be one of: "Code Smell", "Bad Practice", "Potential Bug", "Security Vulnerability", "Performance Issue", "Readability", "Dead Code"
          "severity": "string", // Must be one of: "High", "Medium", "Low", "Informational"
          "description": "string", // Concise description of the issue.
          "explanation": "string", // Why this is a problem.
          "suggestion": "string | null", // Brief suggestion for improvement, or null.
          "code_snippet": "string | null" // The relevant line(s) of code from the snippet below where the issue occurs, if identifiable. Otherwise null. Keep it short.
        }
      ],
      "error_message": null, // Always null for successful analysis
      "skip_reason": null // Always null for successful analysis
    }
    \`\`\`
*   Ensure the "category" and "severity" fields use **only** the specified values.
*   If no significant issues are found, return the JSON with an empty "issues" array and an appropriate "summary".
*   Analyze the code snippet provided below.

Code Snippet (\`${file.path}\`):
\`\`\`
${content.substring(0, MAX_SNIPPET_SIZE)}
\`\`\`
`;
        // --- End New Prompt ---

        try {
            // Call Gemini service (already rate-limited)
            const rawAnalysisResult = await geminiService.generateContent(fileAnalysisPrompt);

            // --- Attempt to Parse JSON ---
            let analysisJson;
            try {
                // Clean potential markdown code fences sometimes added by LLMs
                const cleanedResult = rawAnalysisResult
                    .replace(/^```json\s*/, '')
                    .replace(/\s*```$/, '')
                    .trim();

                analysisJson = JSON.parse(cleanedResult);

                // Basic validation (can be expanded)
                if (!analysisJson.filePath || !analysisJson.status || !Array.isArray(analysisJson.issues)) {
                     throw new Error("Parsed JSON is missing required fields.");
                }
                // Ensure filePath matches (sometimes LLMs might hallucinate)
                analysisJson.filePath = file.path;
                analysisJson.status = "analyzed"; // Force status
                analysisJson.error_message = null;
                analysisJson.skip_reason = null;

                 // Add github link to the analysis object
                 analysisJson.githubUrl = `https://github.com/${owner}/${repo}/blob/${defaultBranch}/${file.path}`;


                console.log(`Successfully parsed analysis for ${file.path}`);
                return analysisJson;

            } catch (parseError) {
                console.error(`Error parsing JSON response for ${file.path}: ${parseError.message}`);
                console.error("Raw LLM Output:", rawAnalysisResult); // Log the problematic output
                return {
                    filePath: file.path,
                    status: "error",
                    summary: null,
                    issues: [],
                    error_message: `LLM returned invalid JSON: ${parseError.message}`,
                    skip_reason: null,
                    rawOutput: rawAnalysisResult // Optionally include raw output for debugging
                };
            }
            // --- End JSON Parsing ---

        } catch (error) {
            console.error(`Error analyzing ${file.path} with Gemini: ${error.message}`);
            // Propagate critical errors like rate limits or auth failures
            if (error.statusCode === 429 || error.statusCode === 401 || error.statusCode === 403 || error.statusCode === 503) {
                 throw error; // Re-throw critical errors to stop the process
             }
             // Return an error structure for non-critical errors
             return {
                filePath: file.path,
                status: "error",
                summary: null,
                issues: [],
                error_message: `Analysis failed: ${error.message}`,
                skip_reason: null
            };
        }
    });

    // Wait for all file analyses to complete
    const results = await Promise.all(analysisPromises);

    // Update counts based on results
    results.forEach(result => {
        if (result.status === 'analyzed') filesAnalyzedCount++;
        else if (result.status === 'skipped') filesSkippedCount++;
        else if (result.status === 'error') filesErroredCount++;
        // Add the result (JSON object) to the final list
        fileAnalyses.push(result);
    });


    console.log("Constructing final analysis object...");

    const finalAnalysis = {
        summary: {
            owner,
            repo,
            defaultBranch, // Include default branch for link construction later
            filesAnalyzed: filesAnalyzedCount,
            filesSkipped: filesSkippedCount,
            filesErrored: filesErroredCount,
            maxFilesAttempted: MAX_FILES_TO_ANALYZE,
            analysisTimestamp: new Date().toISOString(),
            // You could add total issue counts here by iterating through fileAnalyses
        },
        fileAnalyses: fileAnalyses // Array of the JSON objects for each file
    };

    console.log(`Analysis complete for ${owner}/${repo}`);
    return finalAnalysis; // Return the structured JSON analysis
}

module.exports = {
    analyzeRepository,
};