const scanService = require("../services/scanService");
const githubService = require("../services/githubService");
const Scan = require("../models/Scan");
const { AppError } = require("../utils/errorHandler");
const mongoose = require("mongoose");

const startScan = async (req, res, next) => {
  const { owner, repo } = req.params;
  const { branch: requestedBranch } = req.body;
  const accessToken = req.session.accessToken;

  console.log(
    `Requested scan for ${owner}/${repo}, branch: ${requestedBranch}`
  );

  if (!accessToken) {
    return next(new AppError("Authentication required.", 401));
  }
  if (!owner || !repo) {
    return next(new AppError("Repository owner and name are required.", 400));
  }

  try {
    // 1. Get branch info - either requested branch or default branch
    let branchInfo;
    try {
      if (requestedBranch) {
        console.log(`Fetching info for branch: ${requestedBranch}`);
        branchInfo = await githubService.getBranchInfo(
          owner,
          repo,
          requestedBranch,
          accessToken
        );
        console.log(`Branch info retrieved: ${JSON.stringify(branchInfo)}`);
      } else {
        console.log("No branch specified, fetching default branch");
        branchInfo = await githubService.getRepoDefaultBranchInfo(
          owner,
          repo,
          accessToken
        );
        console.log(
          `Default branch info retrieved: ${JSON.stringify(branchInfo)}`
        );
      }
    } catch (error) {
      console.error(`Error getting branch info for ${owner}/${repo}:`, error);
      return next(
        new AppError(
          `Failed to get branch information: ${error.message}`,
          error.statusCode || 500
        )
      );
    }

    const { branchName, commitSha } = branchInfo;
    console.log(`Proceeding with branch: ${branchName}, commit: ${commitSha}`);

    // Check if scan exists
    const existingScan = await Scan.findOne({
      repoOwner: owner,
      repoName: repo,
      branchName: branchName,
      commitSha: commitSha,
    }).lean();

    if (existingScan) {
      console.log(
        `Found existing scan for ${owner}/${repo}, branch: ${existingScan.branchName}, commit: ${existingScan.commitSha}`
      );
      existingScan.isCached = true;
      if (existingScan.summary) {
        existingScan.summary.message = `(Scan result from ${new Date(
          existingScan.scanTimestamp
        ).toLocaleString()} for commit ${commitSha.substring(0, 7)})`;
      }
      return res.json(existingScan);
    }

    console.log(
      `No existing scan found, starting new analysis for ${owner}/${repo}, branch: ${branchName}, commit: ${commitSha}`
    );
    // Proceed with analysis
    const analysisResult = await scanService.analyzeRepository(
      owner,
      repo,
      branchName,
      commitSha,
      accessToken
    );

    analysisResult.isCached = false;
    console.log(
      `Analysis completed for ${owner}/${repo}, branch: ${branchName}`
    );
    res.json(analysisResult);
  } catch (error) {
    console.error(`Error in startScan for ${owner}/${repo}:`, error);
    next(error);
  }
};

// GET /api/scan/:owner/:repo/history - Get list of past scans (summary only)
const getScanHistory = async (req, res, next) => {
  const { owner, repo } = req.params;
  const accessToken = req.session.accessToken;

  if (!accessToken) {
    return next(new AppError("Authentication required.", 401));
  }

  try {
    // Fetch default branch
    let defaultBranch;
    try {
      const branchInfo = await githubService.getRepoDefaultBranchInfo(
        owner,
        repo,
        accessToken
      );
      defaultBranch = branchInfo.branchName;
      console.log(`Default branch for ${owner}/${repo}: ${defaultBranch}`);
    } catch (error) {
      console.error(
        `Error fetching default branch for ${owner}/${repo}:`,
        error
      );
      // If fetching default branch fails, proceed with history but log the issue
      defaultBranch = null;
    }

    // Fetch scan history
    const history = await Scan.find(
      { repoOwner: owner, repoName: repo },
      {
        commitSha: 1,
        branchName: 1,
        scanTimestamp: 1,
        "summary.filesAnalyzed": 1,
        "summary.totalIssues": 1,
        _id: 1,
      }
    )
      .sort({ scanTimestamp: -1 }) // Newest first
      .limit(20) // Limit results
      .lean();

    // Return history and default branch
    res.json({
      defaultBranch,
      history,
    });
  } catch (error) {
    console.error(`Error fetching scan history for ${owner}/${repo}:`, error);
    next(new AppError("Failed to retrieve scan history.", 500));
  }
};

// GET /api/scan/:scanId - Get full details of a specific scan by its ID
const getSpecificScan = async (req, res, next) => {
  const { scanId } = req.params;
  try {
    // Validate if scanId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(scanId)) {
      return next(new AppError("Invalid Scan ID format.", 400));
    }

    const scan = await Scan.findById(scanId).lean();

    if (!scan) {
      return next(new AppError("Scan not found.", 404));
    }
    scan.isCached = true; // Indicate it's a historical scan
    res.json(scan);
  } catch (error) {
    console.error(`Error fetching specific scan ${scanId}:`, error);
    next(new AppError("Failed to retrieve scan details.", 500));
  }
};

module.exports = {
  startScan,
  getScanHistory, // Export new function
  getSpecificScan, // Export new function
};
