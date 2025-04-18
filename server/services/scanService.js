// services/scanService.js
const githubService = require("./githubService");
const geminiService = require("./geminiService");
const Scan = require('../models/Scan'); // Import Scan model
const { AppError } = require("../utils/errorHandler");
const { jsonRepair } = require("jsonrepair");

// --- Configuration (Keep as before) ---
const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024;
const MAX_FILES_TO_ANALYZE = 100;
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
const MAX_SNIPPET_SIZE = 50000;

// --- Define Valid Enum Values ---
const VALID_CATEGORIES = new Set([
    "Code Smell", "Bad Practice", "Potential Bug", "Security Vulnerability",
    "Performance Issue", "Readability", "Dead Code", "Unknown" // Add Unknown as fallback
]);
const VALID_SEVERITIES = new Set(["High", "Medium", "Low", "Informational"]);
const DEFAULT_SEVERITY = "Informational";
const DEFAULT_CATEGORY = "Unknown";

function isRelevantFile(filePath, fileSize) {
    // (Keep as before)
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
    const lowerCasePathEnd = parts[parts.length - 1].toLowerCase();
    const extension = lowerCasePathEnd.includes('.')
        ? '.' + lowerCasePathEnd.split('.').pop()
        : lowerCasePathEnd;
    if (!lowerCasePathEnd.includes('.') && RELEVANT_EXTENSIONS.has(extension)) {
        return true; // Handle extensionless relevant files like Dockerfile
    }
    return RELEVANT_EXTENSIONS.has(extension);
}

// --- Validation and Sanitization Helper ---
// Correct the githubUrl construction
function validateAndSanitizeAnalysis(parsedJson, filePath, owner, repo, branch) { // Use the 'branch' argument
    if (!parsedJson || typeof parsedJson !== 'object') {
        throw new Error("Parsed result is not an object.");
    }

    const sanitized = {
        filePath: filePath,
        status: "analyzed",
        summary: typeof parsedJson.summary === 'string' ? parsedJson.summary : "Summary not provided.",
        issues: [],
        // *** FIX HERE: Use the 'branch' argument passed to the function ***
        githubUrl: `https://github.com/${owner}/${repo}/blob/${branch}/${filePath}`,
        error_message: null,
        skip_reason: null
    };

    if (!Array.isArray(parsedJson.issues)) {
        console.warn(`Issues field is not an array for ${filePath}. Setting to empty array.`);
        parsedJson.issues = [];
    }

    parsedJson.issues.forEach((issue, index) => {
        if (typeof issue !== 'object' || issue === null) {
            console.warn(`Issue at index ${index} for ${filePath} is not an object. Skipping.`);
            return;
        }

        const sanitizedIssue = {};

        // Validate and sanitize category
        sanitizedIssue.category = typeof issue.category === 'string' && VALID_CATEGORIES.has(issue.category)
            ? issue.category
            : DEFAULT_CATEGORY;
        if (sanitizedIssue.category === DEFAULT_CATEGORY && typeof issue.category === 'string') {
             console.warn(`Invalid category "${issue.category}" in ${filePath}, issue ${index}. Using default "${DEFAULT_CATEGORY}".`);
        }

        // Validate and sanitize severity
        sanitizedIssue.severity = typeof issue.severity === 'string' && VALID_SEVERITIES.has(issue.severity)
            ? issue.severity
            : DEFAULT_SEVERITY;
         if (sanitizedIssue.severity === DEFAULT_SEVERITY && typeof issue.severity === 'string') {
             console.warn(`Invalid severity "${issue.severity}" in ${filePath}, issue ${index}. Using default "${DEFAULT_SEVERITY}".`);
         }

        // Ensure required string fields exist
        sanitizedIssue.description = typeof issue.description === 'string' ? issue.description : "Description not provided.";
        sanitizedIssue.explanation = typeof issue.explanation === 'string' ? issue.explanation : "Explanation not provided.";

        // Handle optional fields
        sanitizedIssue.suggestion = typeof issue.suggestion === 'string' ? issue.suggestion : null;
        sanitizedIssue.code_snippet = typeof issue.code_snippet === 'string' ? issue.code_snippet : null;

        // Simple check for extraneous fields like the 'null' example
        const allowedKeys = new Set(['category', 'severity', 'description', 'explanation', 'suggestion', 'code_snippet']);
        Object.keys(issue).forEach(key => {
            if (!allowedKeys.has(key)) {
                console.warn(`Unexpected key "${key}" found in issue ${index} for ${filePath}. Ignoring.`);
            }
        });


        sanitized.issues.push(sanitizedIssue);
    });

    return sanitized;
}
// --- End Helper ---


// Modify function signature to accept branchName and commitSha
async function analyzeRepository(owner, repo, branchName, commitSha, accessToken) {
    if (!geminiService.isGeminiAvailable) {
        throw new AppError("Gemini API key not configured.", 503);
    }
    console.log(`Starting analysis for ${owner}/${repo} at commit ${commitSha.substring(0,7)} on branch ${branchName}`);

    // No need to fetch default branch info again, it's passed in
    let tree;
    try {
        // Fetch tree for the specific commit SHA
        tree = await githubService.getRepoTree(owner, repo, commitSha, accessToken);
        console.log(`Fetched tree for commit ${commitSha} with ${tree.length} items.`);
    } catch (error) {
         // If tree fetch fails for the specific commit, it's a critical error for this scan
         console.error(`Failed to get repository tree for commit ${commitSha}: ${error.message}`);
        throw new AppError(`Failed to get repository tree for commit ${commitSha}: ${error.message}`, error.statusCode || 500);
    }

    const relevantFiles = tree
        .filter(item => item.type === 'blob' && isRelevantFile(item.path, item.size))
        .slice(0, MAX_FILES_TO_ANALYZE);
    console.log(`Found ${relevantFiles.length} relevant files in commit ${commitSha}.`);

    if (relevantFiles.length === 0) {
         // Still construct a summary object, even if no files analyzed
         const emptyAnalysis = {
             summary: { owner, repo, defaultBranch: branchName, commitSha, filesAnalyzed: 0, filesSkipped: 0, filesErrored: 0, maxFilesAttempted: MAX_FILES_TO_ANALYZE, message: "No relevant code files found in this commit.", analysisTimestamp: new Date().toISOString() },
             fileAnalyses: []
         };
          // Attempt to save this 'empty' scan result so we don't re-scan this commit
         try {
              const scanDoc = new Scan({
                  repoOwner: owner,
                  repoName: repo,
                  branchName: branchName,
                  commitSha: commitSha,
                  summary: emptyAnalysis.summary,
                  fileAnalyses: emptyAnalysis.fileAnalyses,
                  scanTimestamp: new Date() // Explicitly set scan timestamp
              });
              await scanDoc.save();
              console.log(`Saved empty scan record for commit ${commitSha}`);
              return scanDoc.toObject(); // Return the saved document data
          } catch (dbError) {
              console.error(`Error saving empty scan record for commit ${commitSha}:`, dbError);
              // If saving fails, still return the basic analysis data
              return emptyAnalysis;
          }
    }

    let filesAnalyzedCount = 0;
    let filesSkippedCount = 0;
    let filesErroredCount = 0;


    const analysisPromises = relevantFiles.map(async (file) => {
        // (Keep file fetching and binary checks as before)
         console.log(`Processing file: ${file.path}`);
         let content;
         try {
             content = await githubService.getFileContent(owner, repo, file.sha, accessToken);
             if (content === null) {
                 console.log(`Skipping content fetch for ${file.path}.`);
                 return { filePath: file.path, status: "skipped", summary: null, issues: [], error_message: null, skip_reason: "Could not retrieve content." };
             }
         } catch (error) {
             console.error(`Error fetching content for ${file.path}: ${error.message}`);
             return { filePath: file.path, status: "error", summary: null, issues: [], error_message: `Failed to fetch content: ${error.message}`, skip_reason: null };
         }
         if (content.includes('\uFFFD')) {
             console.log(`Skipping potentially binary file: ${file.path}`);
             return { filePath: file.path, status: "skipped", summary: null, issues: [], error_message: null, skip_reason: "Detected non-text content." };
         }

        // --- Refined Prompt ---
        const fileAnalysisPrompt = `
Analyze the following code snippet from the file \`${file.path}\` for code quality issues.

Focus on: Code Smells, Bad Practices, Potential Bugs, Security Vulnerabilities, Performance Issues, Readability/Maintainability, Potential Dead Code.

**VERY IMPORTANT OUTPUT FORMAT INSTRUCTIONS:**
*   You **MUST** respond **ONLY** with a single, valid JSON object.
*   **DO NOT** include any text, explanations, apologies, or markdown formatting (like \`\`\`json) before or after the JSON object.
*   The JSON object **MUST** strictly follow this structure:
    \`\`\`json
    {
      "filePath": "string", // The file path: "${file.path}"
      "status": "analyzed",
      "summary": "string", // Brief one-sentence summary of findings.
      "issues": [ // Array of issue objects. Empty array ([]) if no issues found.
        {
          "category": "string", // MUST be one of: "Code Smell", "Bad Practice", "Potential Bug", "Security Vulnerability", "Performance Issue", "Readability", "Dead Code"
          "severity": "string", // MUST be one of: "High", "Medium", "Low", "Informational"
          "description": "string", // Concise description.
          "explanation": "string", // Why it's a problem.
          "suggestion": "string | null", // Brief suggestion or null.
          "code_snippet": "string | null" // Relevant code line(s) or null. Keep short.
        }
      ],
      "error_message": null,
      "skip_reason": null
    }
    \`\`\`
*   Ensure the "category" and "severity" fields use **ONLY** the exact values listed above.
*   If no significant issues are found, return the JSON with an empty "issues" array and an appropriate "summary".
*   Base your analysis only on the provided snippet.

Code Snippet (\`${file.path}\`):
\`\`\`
${content.substring(0, MAX_SNIPPET_SIZE)}
\`\`\`
`;
        // --- End Refined Prompt ---

        try {
            const rawAnalysisResult = await geminiService.generateContent(fileAnalysisPrompt);
            let analysisJson;

            try {
                // 1. Aggressively extract JSON block
                const jsonMatch = rawAnalysisResult.match(/\{[\s\S]*\}/);
                if (!jsonMatch) throw new Error("No JSON object found.");
                let potentialJson = jsonMatch[0];
                 try { potentialJson = jsonRepair(potentialJson); } catch (repairError) { console.warn(`json-repair failed for ${file.path}: ${repairError.message}. Attempting direct parse.`); }
                 analysisJson = JSON.parse(potentialJson);

                // Pass owner, repo, branchName to validation helper
                const validatedData = validateAndSanitizeAnalysis(analysisJson, file.path, owner, repo, branchName); // Use branchName here for URL

                console.log(`Successfully processed analysis for ${file.path}`);
                return validatedData;

            } catch (processError) {
                 console.error(`Error processing analysis response for ${file.path}: ${processError.message}`);
                 console.error("Raw LLM Output:", rawAnalysisResult);
                return { filePath: file.path, status: "error", summary: null, issues: [], error_message: `Failed to process LLM response: ${processError.message}`, skip_reason: null, rawOutput: rawAnalysisResult };
            }
        } catch (error) {
             console.error(`Error analyzing ${file.path} with Gemini: ${error.message}`);
             if (error instanceof AppError && (error.statusCode === 429 || error.statusCode === 401 || error.statusCode === 403 || error.statusCode === 503)) { throw error; }
             return { filePath: file.path, status: "error", summary: null, issues: [], error_message: `Gemini API call failed: ${error.message}`, skip_reason: null };
        }
    });

    const results = await Promise.all(analysisPromises);
    const fileAnalysesResult = []; // Use a different name

    results.forEach(result => {
        const currentResult = result || { status: 'error', error_message: 'Analysis promise resolved unexpectedly null/undefined' };
        if (currentResult.status === 'analyzed') filesAnalyzedCount++;
        else if (currentResult.status === 'skipped') filesSkippedCount++;
        else if (currentResult.status === 'error') filesErroredCount++;
        fileAnalysesResult.push(currentResult);
    });

    console.log("Constructing final analysis object for saving...");
    const finalAnalysisSummary = {
        owner,
        repo,
        defaultBranch: branchName, // Use the scanned branch name
        commitSha: commitSha,      // Include the commit SHA in the summary
        filesAnalyzed: filesAnalyzedCount,
        filesSkipped: filesSkippedCount,
        filesErrored: filesErroredCount,
        maxFilesAttempted: relevantFiles.length,
        analysisTimestamp: new Date().toISOString(), // Timestamp of when analysis finished
    };

    // --- Save to MongoDB ---
    try {
        const scanDocument = new Scan({
            repoOwner: owner,
            repoName: repo,
            branchName: branchName,
            commitSha: commitSha,
            summary: finalAnalysisSummary,
            fileAnalyses: fileAnalysesResult, // Save the detailed file results
            scanTimestamp: new Date() // Record DB save time
        });
        const savedScan = await scanDocument.save();
        console.log(`Successfully saved scan for commit ${commitSha} to MongoDB.`);
        return savedScan.toObject(); // Return the saved data as a plain object
    } catch (dbError) {
        // Handle potential unique key violation (should be caught by controller check, but good fallback)
         if (dbError.code === 11000) {
             console.warn(`Attempted to save duplicate scan for commit ${commitSha}. This should have been caught earlier.`);
             // Optionally, fetch and return the existing scan again here
             const existingScan = await Scan.findOne({ repoOwner: owner, repoName: repo, branchName: branchName, commitSha: commitSha }).lean();
             if (existingScan) {
                 existingScan.isCached = true; // Mark as cached explicitly
                 return existingScan;
             }
         }
        console.error(`Error saving scan result for commit ${commitSha} to MongoDB:`, dbError);
        // If saving fails, still return the analysis data, but maybe add an error flag/message
        // Or throw an AppError to signal the failure to the controller
         throw new AppError(`Failed to save scan results: ${dbError.message}`, 500);
         // Alternatively, return the data without saving:
         // return { summary: finalAnalysisSummary, fileAnalyses: fileAnalysesResult, saveError: dbError.message };
    }
    // --- End Save ---
}

// Remove the outer scope let declarations for owner, repo, defaultBranch
// They are now passed as arguments where needed.

module.exports = {
    analyzeRepository,
};