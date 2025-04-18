// services/scanService.js
const githubService = require("./githubService");
const geminiService = require("./geminiService");
const Scan = require('../models/Scan'); // Import Scan model
const { AppError } = require("../utils/errorHandler");
const { repairJson } = require("@toolsycc/json-repair");

// --- Configuration (Keep as before) ---
const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024;
const MAX_FILES_TO_ANALYZE = 100;
const RELEVANT_EXTENSIONS = new Set([
    '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cs', '.go', '.rb', '.php',
    '.html', '.css', '.scss', '.less', '.vue', '.svelte',
    '.json', '.yaml', '.yml',
    'dockerfile', 'makefile',
    '.sh', '.bash',
    '.sql'
]);
const EXCLUDED_DIRS = new Set([
    'node_modules', '.git', 'dist', 'build', 'out', 'coverage', 'vendor',
    '.vscode', '.idea', '.github', '.md',
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
const VALID_SEVERITIES = new Set(["High", "Medium", "Low", "Informational"]); // "Informational" is already here
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
function validateAndSanitizeAnalysis(parsedJson, filePath, owner, repo, branch, rawOutputForError = null) { // Added rawOutput param
    const githubUrl = `https://github.com/${owner}/${repo}/blob/${branch}/${filePath}`; // Define URL early

    if (!parsedJson || typeof parsedJson !== 'object') {
        console.error(`Parsed result for ${filePath} is not a valid object. Raw:`, rawOutputForError || parsedJson);
        return {
            filePath: filePath, status: "error", summary: "Invalid format received from analysis API.", issues: [],
            githubUrl: githubUrl, error_message: "Parsed result is not an object.", skip_reason: null,
            rawOutput: rawOutputForError || JSON.stringify(parsedJson)
        };
    }

    const sanitized = {
        filePath: filePath,
        status: "analyzed",
        summary: typeof parsedJson.summary === 'string' ? parsedJson.summary : "Summary not provided.",
        issues: [],
        githubUrl: githubUrl,
        error_message: null,
        skip_reason: null,
        rawOutput: null // Will store raw output if processing fails later
    };

    // Validate status if present
    if (parsedJson.status && !["analyzed", "skipped", "error"].includes(parsedJson.status)) {
        console.warn(`Invalid status "${parsedJson.status}" received for ${filePath}. Defaulting to "analyzed".`);
    } else if (parsedJson.status) {
        sanitized.status = parsedJson.status;
    }

    if (!Array.isArray(parsedJson.issues)) {
        if (sanitized.status === 'analyzed') {
            console.warn(`Issues field is not an array for analyzed file ${filePath}. Raw issues:`, parsedJson.issues);
        }
        parsedJson.issues = []; // Ensure issues is always an array
    }

    parsedJson.issues.forEach((issue, index) => {
        if (typeof issue !== 'object' || issue === null) {
            console.warn(`Issue at index ${index} for ${filePath} is not an object or is null. Skipping.`);
            return;
        }

        // Basic structural check: Ensure essential keys are at least present, even if duplicates caused issues
        // We rely on the parser having chosen *one* value for duplicate keys if it succeeded.
        if (typeof issue.category !== 'string' || typeof issue.severity !== 'string' || typeof issue.description !== 'string' || typeof issue.explanation !== 'string') {
             console.warn(`Issue at index ${index} for ${filePath} is missing essential string properties (category, severity, description, explanation) after parsing. Skipping issue. Raw issue:`, issue);
             return; // Skip this potentially corrupted issue object
        }

        const sanitizedIssue = {};
        const allowedKeys = new Set(['category', 'severity', 'description', 'explanation', 'suggestion', 'code_snippet']);

        // Check for and log unexpected keys BEFORE assigning values
        Object.keys(issue).forEach(key => {
            if (!allowedKeys.has(key)) {
                console.warn(`Ignoring unexpected key "${key}" with value "${issue[key]}" found in issue ${index} for ${filePath}.`);
            }
        });

        // Validate and sanitize category (case-insensitive check)
        const originalCategory = issue.category; // Already checked if it's a string above
        const normalizedCategory = originalCategory.trim().toLowerCase();
        const validCategoryMatch = [...VALID_CATEGORIES].find(validCat => validCat.toLowerCase() === normalizedCategory);
        sanitizedIssue.category = validCategoryMatch || DEFAULT_CATEGORY;
        if (!validCategoryMatch) {
             console.warn(`Invalid category "${originalCategory}" in ${filePath}, issue ${index}. Using default "${DEFAULT_CATEGORY}".`);
        }

        // Validate and sanitize severity (case-insensitive check)
        const originalSeverity = issue.severity; // Already checked if it's a string
        const normalizedSeverity = originalSeverity.trim().toLowerCase();
        const validSeverityMatch = [...VALID_SEVERITIES].find(validSev => validSev.toLowerCase() === normalizedSeverity);
        sanitizedIssue.severity = validSeverityMatch || DEFAULT_SEVERITY;
        if (!validSeverityMatch) {
             console.warn(`Invalid severity "${originalSeverity}" in ${filePath}, issue ${index}. Using default "${DEFAULT_SEVERITY}".`);
        }

        // Assign required string fields (already checked they exist as strings)
        sanitizedIssue.description = issue.description;
        sanitizedIssue.explanation = issue.explanation;

        // Handle optional fields, ensuring they are strings or null
        sanitizedIssue.suggestion = typeof issue.suggestion === 'string' ? issue.suggestion : null;
        sanitizedIssue.code_snippet = typeof issue.code_snippet === 'string' ? issue.code_snippet : null;


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

    let tree;
    try {
        tree = await githubService.getRepoTree(owner, repo, commitSha, accessToken);
        console.log(`Fetched tree for commit ${commitSha} with ${tree.length} items.`);
    } catch (error) {
         console.error(`Failed to get repository tree for commit ${commitSha}: ${error.message}`);
        throw new AppError(`Failed to get repository tree for commit ${commitSha}: ${error.statusCode || 500}`, error.statusCode || 500);
    }

    const relevantFiles = tree
        .filter(item => item.type === 'blob' && isRelevantFile(item.path, item.size))
        .slice(0, MAX_FILES_TO_ANALYZE);
    console.log(`Found ${relevantFiles.length} relevant files in commit ${commitSha}.`);

    if (relevantFiles.length === 0) {
         // (Keep handling for empty analysis as before)
         const emptyAnalysis = {
             summary: { owner, repo, defaultBranch: branchName, commitSha, filesAnalyzed: 0, filesSkipped: 0, filesErrored: 0, maxFilesAttempted: MAX_FILES_TO_ANALYZE, message: "No relevant code files found in this commit.", analysisTimestamp: new Date().toISOString() },
             fileAnalyses: []
         };
         try {
              const scanDoc = new Scan({ repoOwner: owner, repoName: repo, branchName: branchName, commitSha: commitSha, summary: emptyAnalysis.summary, fileAnalyses: emptyAnalysis.fileAnalyses, scanTimestamp: new Date() });
              await scanDoc.save();
              console.log(`Saved empty scan record for commit ${commitSha}`);
              return scanDoc.toObject();
          } catch (dbError) {
              console.error(`Error saving empty scan record for commit ${commitSha}:`, dbError);
              return emptyAnalysis;
          }
    }

    let filesAnalyzedCount = 0;
    let filesSkippedCount = 0;
    let filesErroredCount = 0;

    const analysisPromises = relevantFiles.map(async (file) => {
         const githubUrl = `https://github.com/${owner}/${repo}/blob/${branchName}/${file.path}`; // Define URL early
         console.log(`Processing file: ${file.path}`);
         let content;
         try {
             content = await githubService.getFileContent(owner, repo, file.sha, accessToken);
             if (content === null) {
                 console.log(`Skipping content fetch for ${file.path}.`);
                 return { filePath: file.path, status: "skipped", summary: null, issues: [], githubUrl: githubUrl, error_message: null, skip_reason: "Could not retrieve content." };
             }
         } catch (error) {
             console.error(`Error fetching content for ${file.path}: ${error.message}`);
             return { filePath: file.path, status: "error", summary: null, issues: [], githubUrl: githubUrl, error_message: `Failed to fetch content: ${error.message}`, skip_reason: null };
         }
         if (content.includes('\uFFFD')) {
             console.log(`Skipping potentially binary file: ${file.path}`);
             return { filePath: file.path, status: "skipped", summary: null, issues: [], githubUrl: githubUrl, error_message: null, skip_reason: "Detected non-text content." };
         }

        // --- Refined Prompt (Keep as before) ---
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
      "status": "analyzed", // Should always be "analyzed" if successful
      "summary": "string", // Brief one-sentence summary of findings for this file.
      "issues": [ // Array of issue objects. Empty array ([]) if no issues found.
        {
          "category": "string", // MUST be one of: "Code Smell", "Bad Practice", "Potential Bug", "Security Vulnerability", "Performance Issue", "Readability", "Dead Code"
          "severity": "string", // MUST be one of: "High", "Medium", "Low", "Informational"
          "description": "string", // Concise description of the specific issue.
          "explanation": "string", // Why it's a problem.
          "suggestion": "string | null", // Brief suggestion for fixing it or null.
          "code_snippet": "string | null" // Relevant code line(s) or null. Keep snippet short and focused.
        }
      ]
      // Do not include error_message or skip_reason in the successful JSON output.
    }
    \`\`\`
*   Ensure the "category" and "severity" fields use **ONLY** the exact string values listed above (case-sensitive).
*   If no significant issues are found, return the JSON with an empty "issues" array and an appropriate "summary" (e.g., "No significant issues found.").
*   Base your analysis only on the provided code snippet.

Code Snippet (\`${file.path}\`):
\`\`\`
${content.substring(0, MAX_SNIPPET_SIZE)}
\`\`\`
`;
        // --- End Refined Prompt ---

        let rawAnalysisResult = null; // Define here to be accessible in catch
        try {
            console.log(`Executing Gemini request for ${file.path}...`);
            rawAnalysisResult = await geminiService.generateContent(fileAnalysisPrompt);
            console.log(`Gemini request completed for ${file.path}.`);
            let analysisJson;
            let validatedData;

            try {
                // 1. Extract JSON block
                const jsonMatch = rawAnalysisResult.match(/\{[\s\S]*\}/);
                if (!jsonMatch) throw new Error("No JSON object found in LLM response.");
                let potentialJson = jsonMatch[0];

                 // 2. Attempt repair
                 try {
                    potentialJson = repairJson(potentialJson);
                 } catch (repairError) {
                    console.warn(`json-repair failed for ${file.path}: ${repairError.message}. Attempting direct parse.`);
                 }

                 // 3. Attempt direct parse
                 analysisJson = JSON.parse(potentialJson); // This is where the error happened for eslint.config.js

                // 4. Validate and sanitize
                validatedData = validateAndSanitizeAnalysis(analysisJson, file.path, owner, repo, branchName, rawAnalysisResult);

                if (validatedData.status === 'error') {
                     console.error(`Validation failed for ${file.path}: ${validatedData.error_message}`);
                     // rawOutput might already be set by validator if root object was invalid
                     validatedData.rawOutput = validatedData.rawOutput || rawAnalysisResult;
                } else {
                    console.log(`Successfully processed analysis for ${file.path}`);
                }
                return validatedData;

            } catch (processError) {
                 // Catch errors from JSON extraction, repair, parsing, OR validation
                 console.error(`Error processing analysis response for ${file.path}: ${processError.message}`);
                 console.error("Raw LLM Output:", rawAnalysisResult); // Log the raw output that caused the error
                 return {
                     filePath: file.path, status: "error", summary: null, issues: [], githubUrl: githubUrl,
                     error_message: `Failed to process LLM response: ${processError.message}`,
                     skip_reason: null, rawOutput: rawAnalysisResult // Store the problematic raw output
                 };
            }
        } catch (error) {
             // Catch errors specifically from the geminiService call
             console.error(`Error analyzing ${file.path} with Gemini: ${error.message}`);
             if (error instanceof AppError && (error.statusCode === 429 || error.statusCode === 401 || error.statusCode === 403 || error.statusCode === 503)) {
                throw error;
             }
             return {
                 filePath: file.path, status: "error", summary: null, issues: [], githubUrl: githubUrl,
                 error_message: `Gemini API call failed: ${error.message}`,
                 skip_reason: null,
                 // Include raw output here ONLY if it was captured before the error
                 rawOutput: rawAnalysisResult
             };
        }
    });

    const results = await Promise.all(analysisPromises);
    const fileAnalysesResult = [];

    results.forEach(result => {
        const currentResult = result || {
             filePath: 'unknown', status: 'error',
             error_message: 'Analysis promise resolved unexpectedly null/undefined',
             issues: [], githubUrl: `https://github.com/${owner}/${repo}`
        };
        if (currentResult.status === 'analyzed') filesAnalyzedCount++;
        else if (currentResult.status === 'skipped') filesSkippedCount++;
        else if (currentResult.status === 'error') filesErroredCount++;
        else {
             console.warn(`Unexpected status "${currentResult.status}" for file ${currentResult.filePath}. Counting as error.`);
             filesErroredCount++;
             currentResult.status = 'error';
        }
        fileAnalysesResult.push(currentResult);
    });

    console.log("Constructing final analysis object for saving...");
    const finalAnalysisSummary = {
        owner, repo, defaultBranch: branchName, commitSha: commitSha,
        filesAnalyzed: filesAnalyzedCount, filesSkipped: filesSkippedCount, filesErrored: filesErroredCount,
        maxFilesAttempted: relevantFiles.length, analysisTimestamp: new Date().toISOString(),
    };

    // --- Save to MongoDB (Keep as before) ---
    try {
        const scanDocument = new Scan({
            repoOwner: owner, repoName: repo, branchName: branchName, commitSha: commitSha,
            summary: finalAnalysisSummary, fileAnalyses: fileAnalysesResult, scanTimestamp: new Date()
        });
        const savedScan = await scanDocument.save();
        console.log(`Successfully saved scan for commit ${commitSha} to MongoDB.`);
        return savedScan.toObject();
    } catch (dbError) {
         if (dbError.code === 11000) {
             console.warn(`Attempted to save duplicate scan for commit ${commitSha}. Fetching existing.`);
             const existingScan = await Scan.findOne({ repoOwner: owner, repoName: repo, branchName: branchName, commitSha: commitSha }).lean();
             if (existingScan) {
                 existingScan.isCached = true;
                 return existingScan;
             }
              throw new AppError(`Duplicate scan detected for commit ${commitSha}, but failed to retrieve existing.`, 500);
         }
        console.error(`Error saving scan result for commit ${commitSha} to MongoDB:`, dbError);
         throw new AppError(`Failed to save scan results: ${dbError.message}`, 500);
    }
    // --- End Save ---
}


module.exports = {
    analyzeRepository,
};