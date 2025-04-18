// models/Scan.js
const mongoose = require('mongoose');

// Define a sub-schema for the issues within a file analysis
const IssueSchema = new mongoose.Schema({
    category: { type: String, required: true, enum: ["Code Smell", "Bad Practice", "Potential Bug", "Security Vulnerability", "Performance Issue", "Readability", "Dead Code", "Unknown"] },
    severity: { type: String, required: true, enum: ["High", "Medium", "Low", "Informational"] },
    description: { type: String, required: true },
    explanation: { type: String, required: true },
    suggestion: { type: String, default: null },
    code_snippet: { type: String, default: null }
}, { _id: false }); // Don't create separate _id for each issue

// Define a sub-schema for each file's analysis result
const FileAnalysisSchema = new mongoose.Schema({
    filePath: { type: String, required: true },
    status: { type: String, required: true, enum: ["analyzed", "skipped", "error"] },
    summary: { type: String, default: null },
    issues: [IssueSchema], // Embed the issues array
    githubUrl: { type: String },
    error_message: { type: String, default: null },
    skip_reason: { type: String, default: null },
    rawOutput: { type: String, default: null } // Store raw output for errored analyses if needed
}, { _id: false }); // Don't create separate _id for each file analysis

// Define the main Scan schema
const ScanSchema = new mongoose.Schema({
    repoOwner: {
        type: String,
        required: true,
        index: true,
    },
    repoName: {
        type: String,
        required: true,
        index: true,
    },
    branchName: { // Store the branch the scan was run against
        type: String,
        required: true,
        index: true,
    },
    commitSha: { // The specific commit analyzed
        type: String,
        required: true,
        index: true,
    },
    scanTimestamp: { // When the scan document was created/completed
        type: Date,
        default: Date.now,
        index: true,
    },
    summary: { // The overall scan summary object
        owner: String,
        repo: String,
        defaultBranch: String, // Or perhaps 'scannedBranch'? Let's keep defaultBranch for now
        filesAnalyzed: Number,
        filesSkipped: Number,
        filesErrored: Number,
        maxFilesAttempted: Number,
        analysisTimestamp: Date, // Timestamp from the summary object itself
        message: String, // Optional message like "No relevant files found"
        // Add other summary fields if needed
    },
    fileAnalyses: [FileAnalysisSchema] // Embed the array of file analyses
});

// Create a compound index to ensure uniqueness per repo/branch/commit
ScanSchema.index({ repoOwner: 1, repoName: 1, branchName: 1, commitSha: 1 }, { unique: true });

module.exports = mongoose.model('Scan', ScanSchema);