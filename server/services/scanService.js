const githubService = require("./githubService");
const geminiService = require("./geminiService");
const Scan = require("../models/Scan");
const { AppError } = require("../utils/errorHandler");

// Configuration
const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB FOR TESTING
const MAX_FILES_TO_ANALYZE = 200; // FOR TESTING.
const RELEVANT_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".py",
  ".java",
  ".cs",
  ".go",
  ".rb",
  ".php",
  ".html",
  ".css",
  ".scss",
  ".less",
  ".vue",
  ".svelte",
  ".json",
  ".yaml",
  ".yml",
  "dockerfile",
  "makefile",
  ".sh",
  ".bash",
  ".sql",
]);
const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  "coverage",
  "vendor",
  ".vscode",
  ".idea",
  ".github",
  ".md",
  "__pycache__",
  ".pytest_cache",
  "target",
  "bin",
  "obj",
]);
const EXCLUDED_FILES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  ".env",
]);
const MAX_SNIPPET_SIZE = 100000; // 100 KB FOR TESTING

const VALID_CATEGORIES = [
  "Code Smell",
  "Bad Practice",
  "Potential Bug",
  "Security Vulnerability",
  "Performance Issue",
  "Readability",
  "Dead Code",
  "Unknown",
];
const VALID_SEVERITIES = ["High", "Medium", "Low", "Informational"];
const DEFAULT_SEVERITY = "Informational";
const DEFAULT_CATEGORY = "Unknown";

function isRelevantFile(filePath, fileSize) {
  if (!filePath || EXCLUDED_FILES.has(filePath.toLowerCase())) {
    return false;
  }
  if (fileSize > MAX_FILE_SIZE_BYTES) {
    console.log(
      `Skipping large file: ${filePath} (${(fileSize / 1024).toFixed(1)} KB)`
    );
    return false;
  }
  const parts = filePath.split("/");
  if (parts.some((part) => EXCLUDED_DIRS.has(part.toLowerCase()))) {
    return false;
  }
  const lowerCasePathEnd = parts[parts.length - 1].toLowerCase();
  const extension = lowerCasePathEnd.includes(".")
    ? "." + lowerCasePathEnd.split(".").pop()
    : lowerCasePathEnd;
  if (!lowerCasePathEnd.includes(".") && RELEVANT_EXTENSIONS.has(extension)) {
    return true;
  }
  return RELEVANT_EXTENSIONS.has(extension);
}

// Validation helper
function validateAndSanitizeAnalysis(
  parsedJson,
  filePath,
  owner,
  repo,
  branch,
  rawOutputForError = null
) {
  const githubUrl = `https://github.com/${owner}/${repo}/blob/${branch}/${filePath}`;

  if (!parsedJson || typeof parsedJson !== "object") {
    console.error(
      `Parsed result for ${filePath} is not a valid object. Raw:`,
      rawOutputForError || parsedJson
    );
    return {
      filePath: filePath,
      status: "error",
      summary: "Invalid format received from analysis API.",
      issues: [],
      githubUrl: githubUrl,
      error_message: "Parsed result is not an object.",
      skip_reason: null,
      rawOutput: rawOutputForError || JSON.stringify(parsedJson),
    };
  }

  const sanitized = {
    filePath: filePath,
    status: "analyzed",
    summary:
      typeof parsedJson.summary === "string"
        ? parsedJson.summary
        : "Summary not provided.",
    issues: [],
    githubUrl: githubUrl,
    error_message: null,
    skip_reason: null,
    rawOutput: null,
  };

  if (
    parsedJson.status &&
    !["analyzed", "skipped", "error"].includes(parsedJson.status)
  ) {
    console.warn(
      `Invalid status "${parsedJson.status}" received for ${filePath}. Defaulting to "analyzed".`
    );
  } else if (parsedJson.status) {
    sanitized.status = parsedJson.status;
  }

  if (!Array.isArray(parsedJson.issues)) {
    if (sanitized.status === "analyzed") {
      console.warn(
        `Issues field is not an array for analyzed file ${filePath}. Raw issues:`,
        parsedJson.issues
      );
    }
    parsedJson.issues = [];
  }

  parsedJson.issues.forEach((issue, index) => {
    if (typeof issue !== "object" || issue === null) {
      console.warn(
        `Issue at index ${index} for ${filePath} is not an object or is null. Skipping.`
      );
      return;
    }
    if (
      typeof issue.category !== "string" ||
      typeof issue.severity !== "string" ||
      typeof issue.description !== "string" ||
      typeof issue.explanation !== "string"
    ) {
      console.warn(
        `Issue at index ${index} for ${filePath} is missing essential string properties. Skipping issue. Raw:`,
        issue
      );
      return;
    }
    const sanitizedIssue = {};
    sanitizedIssue.category = VALID_CATEGORIES.includes(issue.category)
      ? issue.category
      : DEFAULT_CATEGORY;
    sanitizedIssue.severity = VALID_SEVERITIES.includes(issue.severity)
      ? issue.severity
      : DEFAULT_SEVERITY;
    sanitizedIssue.description = issue.description;
    sanitizedIssue.explanation = issue.explanation;
    sanitizedIssue.suggestion =
      typeof issue.suggestion === "string" ? issue.suggestion : null;
    sanitizedIssue.code_snippet =
      typeof issue.code_snippet === "string" ? issue.code_snippet : null;
    sanitized.issues.push(sanitizedIssue);
  });

  return sanitized;
}

// --- Main function ---
async function analyzeRepository(
  owner,
  repo,
  branchName,
  commitSha,
  accessToken
) {
  if (!geminiService.isGeminiAvailable) {
    throw new AppError("Gemini API key not configured.", 503);
  }
  console.log(
    `Starting analysis for ${owner}/${repo} at commit ${commitSha.substring(
      0,
      7
    )} on branch ${branchName}`
  );

  const tree = await githubService.getRepoTree(
    owner,
    repo,
    commitSha,
    accessToken
  );
  const relevantFiles = tree
    .filter(
      (item) => item.type === "blob" && isRelevantFile(item.path, item.size)
    )
    .slice(0, MAX_FILES_TO_ANALYZE);

  if (relevantFiles.length === 0) {
    const emptyAnalysis = {
      summary: {
        owner,
        repo,
        defaultBranch: branchName,
        commitSha,
        filesAnalyzed: 0,
        filesSkipped: 0,
        filesErrored: 0,
        maxFilesAttempted: MAX_FILES_TO_ANALYZE,
        message: "No relevant code files found in this commit.",
        analysisTimestamp: new Date().toISOString(),
      },
      fileAnalyses: [],
    };
    const scanDoc = new Scan({
      repoOwner: owner,
      repoName: repo,
      branchName: branchName,
      commitSha: commitSha,
      summary: emptyAnalysis.summary,
      fileAnalyses: emptyAnalysis.fileAnalyses,
      scanTimestamp: new Date(),
    });
    await scanDoc.save();
    return scanDoc.toObject();
  }

  const analysisPromises = relevantFiles.map(async (file) => {
    const githubUrl = `https://github.com/${owner}/${repo}/blob/${branchName}/${file.path}`;
    let content;
    try {
      content = await githubService.getFileContent(
        owner,
        repo,
        file.sha,
        accessToken
      );
      if (content === null || content.includes("\uFFFD")) {
        const reason =
          content === null
            ? "Could not retrieve content."
            : "Detected non-text content.";
        return {
          filePath: file.path,
          status: "skipped",
          summary: null,
          issues: [],
          githubUrl,
          error_message: null,
          skip_reason: reason,
        };
      }
    } catch (error) {
      return {
        filePath: file.path,
        status: "error",
        summary: null,
        issues: [],
        githubUrl,
        error_message: `Failed to fetch content: ${error.message}`,
        skip_reason: null,
      };
    }

    // --- 1. Define the JSON Schema for the response ---
    const analysisSchema = {
      type: "OBJECT",
      properties: {
        filePath: { type: "STRING" },
        status: { type: "STRING", enum: ["analyzed"] },
        summary: { type: "STRING" },
        issues: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              category: { type: "STRING", enum: VALID_CATEGORIES },
              severity: { type: "STRING", enum: VALID_SEVERITIES },
              description: { type: "STRING" },
              explanation: { type: "STRING" },
              suggestion: { type: "STRING", nullable: true },
              code_snippet: { type: "STRING", nullable: true },
            },
            required: ["category", "severity", "description", "explanation"],
          },
        },
      },
      required: ["filePath", "status", "summary", "issues"],
    };

    // --- 2. Simplify the prompt ---
    // Remove all JSON formatting instructions as the schema now handles it.
    const fileAnalysisPrompt = `
Analyze the following code snippet from the file \`${
      file.path
    }\` for code quality issues.
Focus on: Code Smells, Bad Practices, Potential Bugs, Security Vulnerabilities, Performance Issues, Readability/Maintainability, and Potential Dead Code.

Your response will be structured as a JSON object based on the provided schema.
- Provide a brief, one-sentence summary of your findings for this file.
- For each issue found, provide its category, severity, a concise description, an explanation of why it's a problem, a suggested fix, and a relevant code snippet.
- If no significant issues are found, return the JSON with an empty "issues" array and an appropriate "summary" (e.g., "No significant issues found.").
























Code Snippet (\`${file.path}\`):
\`\`\`
${content.substring(0, MAX_SNIPPET_SIZE)}
\`\`\`
`;
    // --- 3. Create the full generation request object ---
    const generationRequest = {
      contents: [{ role: "user", parts: [{ text: fileAnalysisPrompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
      },
    };

    let rawAnalysisResult = null;
    try {
      console.log(`Executing structured Gemini request for ${file.path}...`);
      // --- 4. Call Gemini service with the structured request ---
      rawAnalysisResult = await geminiService.generateContent(
        generationRequest
      );
      console.log(`Structured Gemini request completed for ${file.path}.`);

      let analysisJson;
      let validatedData;

      try {
        // --- 5. Directly parse the JSON response ---
        // No more regex or json-repair needed.
        analysisJson = JSON.parse(rawAnalysisResult);
        validatedData = validateAndSanitizeAnalysis(
          analysisJson,
          file.path,
          owner,
          repo,
          branchName
        );

        if (validatedData.status === "error") {
          console.error(
            `Validation failed for ${file.path}: ${validatedData.error_message}`
          );
          validatedData.rawOutput = rawAnalysisResult;
        } else {
          console.log(`Successfully processed analysis for ${file.path}`);
        }
        return validatedData;
      } catch (processError) {
        console.error(
          `Error parsing structured JSON response for ${file.path}: ${processError.message}`
        );
        console.error("Raw LLM Output:", rawAnalysisResult);
        return {
          filePath: file.path,
          status: "error",
          summary: null,
          issues: [],
          githubUrl: githubUrl,
          error_message: `Failed to parse structured JSON: ${processError.message}`,
          skip_reason: null,
          rawOutput: rawAnalysisResult,
        };
      }
    } catch (error) {
      console.error(
        `Error analyzing ${file.path} with Gemini: ${error.message}`
      );
      if (
        error instanceof AppError &&
        (error.statusCode === 429 ||
          error.statusCode === 401 ||
          error.statusCode === 403 ||
          error.statusCode === 503)
      ) {
        throw error;
      }
      return {
        filePath: file.path,
        status: "error",
        summary: null,
        issues: [],
        githubUrl: githubUrl,
        error_message: `Gemini API call failed: ${error.message}`,
        skip_reason: null,
        rawOutput: rawAnalysisResult,
      };
    }
  });

  const results = await Promise.all(analysisPromises);
  const fileAnalysesResult = [];
  let filesAnalyzedCount = 0,
    filesSkippedCount = 0,
    filesErroredCount = 0;

  results.forEach((result) => {
    const currentResult = result || {
      filePath: "unknown",
      status: "error",
      error_message: "Analysis promise resolved unexpectedly null/undefined",
      issues: [],
      githubUrl: `https://github.com/${owner}/${repo}`,
    };
    if (currentResult.status === "analyzed") filesAnalyzedCount++;
    else if (currentResult.status === "skipped") filesSkippedCount++;
    else filesErroredCount++;
    fileAnalysesResult.push(currentResult);
  });

  const finalAnalysisSummary = {
    owner,
    repo,
    defaultBranch: branchName,
    commitSha: commitSha,
    filesAnalyzed: filesAnalyzedCount,
    filesSkipped: filesSkippedCount,
    filesErrored: filesErroredCount,
    maxFilesAttempted: relevantFiles.length,
    analysisTimestamp: new Date().toISOString(),
  };

  try {
    const scanDocument = new Scan({
      repoOwner: owner,
      repoName: repo,
      branchName: branchName,
      commitSha: commitSha,
      summary: finalAnalysisSummary,
      fileAnalyses: fileAnalysesResult,
      scanTimestamp: new Date(),
    });
    const savedScan = await scanDocument.save();
    console.log(`Successfully saved scan for commit ${commitSha} to MongoDB.`);
    return savedScan.toObject();
  } catch (dbError) {
    if (dbError.code === 11000) {
      console.warn(
        `Attempted to save duplicate scan for commit ${commitSha}. Fetching existing.`
      );
      const existingScan = await Scan.findOne({
        repoOwner: owner,
        repoName: repo,
        branchName: branchName,
        commitSha: commitSha,
      }).lean();
      if (existingScan) {
        existingScan.isCached = true;
        return existingScan;
      }
      throw new AppError(
        `Duplicate scan detected for commit ${commitSha}, but failed to retrieve existing.`,
        500
      );
    }
    console.error(
      `Error saving scan result for commit ${commitSha} to MongoDB:`,
      dbError
    );
    throw new AppError(`Failed to save scan results: ${dbError.message}`, 500);
  }
}

module.exports = {
  analyzeRepository,
};
