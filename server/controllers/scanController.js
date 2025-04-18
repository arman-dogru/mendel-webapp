// controllers/scanController.js
const scanService = require('../services/scanService');
const githubService = require('../services/githubService');
const Scan = require('../models/Scan');
const { AppError } = require('../utils/errorHandler');
const mongoose = require('mongoose'); // <-- Ensure mongoose is imported

const startScan = async (req, res, next) => {
    const { owner, repo } = req.params;
    const accessToken = req.session.accessToken; // Assuming checkAuth middleware adds this

    if (!accessToken) {
        return next(new AppError("Authentication required.", 401));
    }
    if (!owner || !repo) {
        return next(new AppError("Repository owner and name are required.", 400));
    }

    try {
        // 1. Get default branch and its LATEST commit SHA
        let branchInfo;
        try {
            branchInfo = await githubService.getRepoDefaultBranchInfo(owner, repo, accessToken);
             console.log(`Branch: ${branchInfo.branchName}, Latest Commit: ${branchInfo.commitSha}`);
        } catch (error) {
             // Handle specific errors from getting branch info if needed
             console.error(`Error getting branch info for ${owner}/${repo}:`, error);
             return next(new AppError(`Failed to get branch information for repository: ${error.message}`, error.statusCode || 500));
        }

        const { branchName, commitSha } = branchInfo;

        // 2. Check if a scan already exists for this specific commit
        const existingScan = await Scan.findOne({
            repoOwner: owner,
            repoName: repo,
            branchName: branchName,
            commitSha: commitSha
        }).lean(); // Use .lean() for faster read-only queries if not modifying

        if (existingScan) {
            console.log(`Returning existing scan for ${owner}/${repo}, commit ${commitSha}`);
            // Add a flag or modify summary to indicate it's cached
            existingScan.isCached = true; // Simple flag
            if (existingScan.summary) {
                existingScan.summary.message = `(Scan result from ${new Date(existingScan.scanTimestamp).toLocaleString()} for commit ${commitSha.substring(0,7)})`;
            }
            return res.json(existingScan);
        }

        // 3. If no existing scan, proceed with analysis
        console.log(`No existing scan found for commit ${commitSha}. Starting new analysis.`);
        // Pass owner, repo, branchName, commitSha, accessToken to the service
        const analysisResult = await scanService.analyzeRepository(
            owner,
            repo,
            branchName, // Pass branch name
            commitSha, // Pass commit SHA
            accessToken
        );

        // 4. Save the new analysis result (Service will handle saving now)
        // The service now returns the saved document or the analysis data

         // Ensure the result isn't marked as cached if it's a new scan
         analysisResult.isCached = false;

        res.json(analysisResult);

    } catch (error) {
        // Pass errors (including those from analyzeRepository) to the error handler
        next(error);
    }
};

// --- Add endpoints to view scan history ---

// GET /api/scan/:owner/:repo/history - Get list of past scans (summary only)
const getScanHistory = async (req, res, next) => {
    const { owner, repo } = req.params;
    try {
        const history = await Scan.find(
            { repoOwner: owner, repoName: repo },
            { commitSha: 1, branchName: 1, scanTimestamp: 1, 'summary.filesAnalyzed': 1, 'summary.totalIssues': 1, _id: 1 } // Projection: Select only needed fields
        )
        .sort({ scanTimestamp: -1 }) // Newest first
        .limit(20) // Limit results
        .lean();

        res.json(history);
    } catch (error) {
        console.error(`Error fetching scan history for ${owner}/${repo}:`, error);
        next(new AppError('Failed to retrieve scan history.', 500));
    }
};

// GET /api/scan/:scanId - Get full details of a specific scan by its ID
const getSpecificScan = async (req, res, next) => {
    const { scanId } = req.params;
    try {
        // Validate if scanId is a valid ObjectId
         if (!mongoose.Types.ObjectId.isValid(scanId)) {
             return next(new AppError('Invalid Scan ID format.', 400));
         }

        const scan = await Scan.findById(scanId).lean();

        if (!scan) {
            return next(new AppError('Scan not found.', 404));
        }
         scan.isCached = true; // Indicate it's a historical scan
        res.json(scan);
    } catch (error) {
        console.error(`Error fetching specific scan ${scanId}:`, error);
        next(new AppError('Failed to retrieve scan details.', 500));
    }
};


module.exports = {
    startScan,
    getScanHistory,   // Export new function
    getSpecificScan,  // Export new function
};