// server/controllers/repoController.js

const axios = require("axios");
const { decryptData } = require("../utils/crypto");
const { AppError } = require("../utils/errorHandler");
const githubAppService = require('../services/githubAppService'); // Import App Service (Though not used in this file after resolution)

// --- Helper for GitHub API Requests (USING USER OAUTH TOKEN) ---
const githubApiRequestUser = async (url, accessToken, params = {}) => {
  // Added check for token presence
  if (!accessToken) {
    console.error("githubApiRequestUser: accessToken is missing!");
    throw new AppError("Authentication token is missing for user request", 401);
  }
  try {
    // console.log(`githubApiRequestUser: Calling URL: ${url} with token ending in ...${accessToken.slice(-6)}`);
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        'X-GitHub-Api-Version': '2022-11-28' // Good practice to specify version
      },
      params,
    });
    return response.data;
  } catch (error) {
    console.error(`githubApiRequestUser: Error calling ${url}`, error.message);
    if (axios.isAxiosError(error) && error.response) {
      const { status, data } = error.response;
       console.error(`GitHub API Error (${status}) for user request:`, data?.message || data);
      if (status === 401) {
         throw new AppError("GitHub API: Bad credentials or insufficient permissions (User Token).", 401);
      }
      if (status === 403) {
         throw new AppError("GitHub API: Forbidden. Check user token permissions or API rate limits.", 403);
      }
      if (status === 404) {
        throw new AppError("GitHub API: Resource not found. Check owner/repo name or user token permissions.", 404);
      }
      if (status === 429) {
          throw new AppError("GitHub API: Rate limit exceeded.", 429);
      }
      // Generic error for other statuses
      throw new AppError(
        `GitHub API error for user request: ${data?.message || "Unknown error"}`,
        status
      );
    }
    // Network or other errors
    throw new AppError("Failed to reach GitHub API for user request", 503);
  }
};


// --- Controller Functions ---

const getRepoBranches = async (req, res, next) => {
  const { owner, repo } = req.params;
  const userAccessToken = req.accessToken;

  console.log(`getRepoBranches: Request for ${owner}/${repo}`);
  if (!userAccessToken) {
      console.error(`getRepoBranches: Missing userAccessToken in request for ${owner}/${repo}.`);
      return next(new AppError("Authentication token missing.", 401));
  }
  console.log(`getRepoBranches: Using user token starting with ${userAccessToken.substring(0, 4)}... ending with ...${userAccessToken.slice(-4)}`);

  try {
    const data = await githubApiRequestUser(
      `https://api.github.com/repos/${owner}/${repo}/branches`,
      userAccessToken
    );
    const branches = data.map((branch) => ({
      name: branch.name,
      commit: branch.commit.sha,
    }));
    res.json(branches);
  } catch (error) {
    console.error(`getRepoBranches: Error fetching branches for ${owner}/${repo}:`, error.message);
    next(error);
  }
};

const getRepoCommits = async (req, res, next) => {
  const { owner, repo } = req.params;
  const { branch } = req.query;
  const userAccessToken = req.accessToken;

   console.log(`getRepoCommits: Request for ${owner}/${repo}, Branch: ${branch}`);
   if (!userAccessToken) {
       console.error(`getRepoCommits: Missing userAccessToken for ${owner}/${repo}.`);
       return next(new AppError("Authentication token missing.", 401));
   }
    console.log(`getRepoCommits: Using user token starting/ending: ${userAccessToken.substring(0, 4)}...${userAccessToken.slice(-4)}`);
   if (!branch) {
       console.warn(`getRepoCommits: Branch name query parameter is missing for ${owner}/${repo}.`);
       return next(new AppError("Branch name is required", 400));
   }

  try {
    const data = await githubApiRequestUser(
      `https://api.github.com/repos/${owner}/${repo}/commits`,
      userAccessToken,
      { sha: branch }
    );
    const commits = data.map((commit) => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author?.name || 'Unknown',
      date: commit.commit.author?.date,
      branch: branch,
      parents: commit.parents.map((parent) => parent.sha),
    }));
    res.json(commits);
  } catch (error) {
    console.error(`getRepoCommits: Error fetching commits for ${owner}/${repo}, branch ${branch}:`, error.message);
    next(error);
  }
};

const getRepoMerges = async (req, res, next) => {
    const { owner, repo } = req.params;
    const userAccessToken = req.accessToken;

    console.log(`getRepoMerges: Request for ${owner}/${repo}`);
     if (!userAccessToken) {
         console.error(`getRepoMerges: Missing userAccessToken for ${owner}/${repo}.`);
         return next(new AppError("Authentication token missing.", 401));
     }
      console.log(`getRepoMerges: Using user token starting/ending: ${userAccessToken.substring(0, 4)}...${userAccessToken.slice(-4)}`);

    try {
        const data = await githubApiRequestUser(
            `https://api.github.com/repos/${owner}/${repo}/pulls`,
            userAccessToken,
             { state: 'closed', per_page: 100 }
        );
        const merges = data
            .filter((pr) => pr.merged_at)
            .map((pr) => ({
                prNumber: pr.number,
                title: pr.title,
                mergedAt: pr.merged_at,
                baseBranch: pr.base.ref,
                headBranch: pr.head.ref,
                mergeCommitSha: pr.merge_commit_sha,
            }));
        res.json(merges);
    } catch (error) {
        console.error(`getRepoMerges: Error fetching merges for ${owner}/${repo}:`, error.message);
        next(error);
    }
};

const getRepoIssues = async (req, res, next) => {
    const { owner, repo } = req.params;
    const { state = "open" } = req.query;
    const userAccessToken = req.accessToken;

     console.log(`getRepoIssues: Request for ${owner}/${repo}, State: ${state}`);
      if (!userAccessToken) {
          console.error(`getRepoIssues: Missing userAccessToken for ${owner}/${repo}.`);
          return next(new AppError("Authentication token missing.", 401));
      }
       console.log(`getRepoIssues: Using user token starting/ending: ${userAccessToken.substring(0, 4)}...${userAccessToken.slice(-4)}`);

    try {
        const data = await githubApiRequestUser(
            `https://api.github.com/repos/${owner}/${repo}/issues`,
            userAccessToken,
            { state: state, per_page: 100 }
        );
        const issues = data
            .filter((issue) => !issue.pull_request)
            .map((issue) => ({
                id: issue.number,
                title: issue.title,
                createdAt: issue.created_at,
                author: issue.user?.login || 'Unknown',
                status: issue.state,
                labels: issue.labels.map((label) => label.name),
                comments: issue.comments,
                url: issue.html_url,
            }));
        res.json(issues);
    } catch (error) {
        console.error(`getRepoIssues: Error fetching issues for ${owner}/${repo}, state ${state}:`, error.message);
        next(error);
    }
};

const getRepoPR = async (req, res, next) => {
    const { owner, repo } = req.params;
    const userAccessToken = req.accessToken;
    const encryptedUsername = req.session.encryptedUsername;
    const currentUser = encryptedUsername ? decryptData(encryptedUsername) : null;
    const { branch } = req.query;

    console.log(`getRepoPR: Request for ${owner}/${repo}, Base Branch Filter: ${branch || 'any'}`);
    if (!userAccessToken) {
        console.error(`getRepoPR: Missing userAccessToken for ${owner}/${repo}.`);
        return next(new AppError("Authentication token missing.", 401));
    }
     console.log(`getRepoPR: Using user token starting/ending: ${userAccessToken.substring(0, 4)}...${userAccessToken.slice(-4)}`);
    if (!currentUser) {
         console.error(`getRepoPR: Could not decrypt username from session for ${owner}/${repo}.`);
        return next(new AppError("User context missing, please log in again.", 401));
    }

    try {
        const prParams = { state: "all", per_page: 100 };
        if (branch) {
            prParams.base = branch;
        }
        const prData = await githubApiRequestUser(
            `https://api.github.com/repos/${owner}/${repo}/pulls`,
            userAccessToken,
            prParams
        );

        const prs = prData.map((pr, index) => ({
            id: pr.number,
            title: pr.title,
            createdAt: pr.created_at,
            author: pr.user?.login || 'Unknown',
            status: pr.state,
            labels: pr.labels.map((label) => label.name),
            comments: pr.comments,
            review_comments: pr.review_comments,
            mergedAt: pr.merged_at,
            requestedReviewers: pr.requested_reviewers
                ? pr.requested_reviewers.map((reviewer) => reviewer.login)
                : [],
            baseBranch: pr.base.ref,
            headBranch: pr.head.ref,
            url: pr.html_url,
        }));

        const categorizedPRs = {
            open: [],
            needsYourReview: [],
            waitingForAuthor: [],
            closed: [],
            merged: [],
        };

        prs.forEach((pr) => {
            const isMerged = !!pr.mergedAt;
            const isOpen = pr.status === 'open';
            const isAuthor = pr.author === currentUser;
             const mayNeedReview = pr.requestedReviewers.includes(currentUser);

            if (isOpen) {
                categorizedPRs.open.push(pr);
                if (isAuthor && (pr.comments > 0 || pr.review_comments > 0)) {
                    categorizedPRs.waitingForAuthor.push(pr);
                } else if (mayNeedReview) {
                     categorizedPRs.needsYourReview.push(pr);
                }
            } else {
                if (isMerged) {
                    categorizedPRs.merged.push(pr);
                } else {
                    categorizedPRs.closed.push(pr);
                }
            }
        });

        res.json(categorizedPRs);
    } catch (error) {
         console.error(`getRepoPR: Error fetching PRs for ${owner}/${repo}:`, error.message);
        next(error);
    }
};

const getRepoContributors = async (req, res, next) => {
    const { owner, repo } = req.params;
    const userAccessToken = req.accessToken;

    console.log(`getRepoContributors: Request for ${owner}/${repo}`);
     if (!userAccessToken) {
         console.error(`getRepoContributors: Missing userAccessToken for ${owner}/${repo}.`);
         return next(new AppError("Authentication token missing.", 401));
     }
      console.log(`getRepoContributors: Using user token starting/ending: ${userAccessToken.substring(0, 4)}...${userAccessToken.slice(-4)}`);

    // ** RESOLVED CONFLICT: Kept 'test' branch structure **
    try {
        // Fetch contributors list
        const contributorsData = await githubApiRequestUser(
            `https://api.github.com/repos/${owner}/${repo}/contributors`,
            userAccessToken,
            { per_page: 100 } // Get up to 100 contributors
        );

        // Enhancement: Fetch details in parallel for potentially better performance
        const contributorDetailsPromises = contributorsData.map(async (contributor) => {
            // Fetch user details (might contain email if public)
            let userDetail = null;
            try {
                // Use the correct helper with the user token
                userDetail = await githubApiRequestUser(
                    contributor.url, // Use the user API URL from the contributor data
                     userAccessToken
                 );
            } catch (userFetchError) {
                 console.warn(`Failed to fetch user details for ${contributor.login}: ${userFetchError.message}`);
            }

            // PR count fetching is omitted for now (as it was commented in 'test' branch)

            return {
                name: contributor.login,
                // Use email from user details if available and public, otherwise fallback
                email: userDetail?.email || `${contributor.login}@users.noreply.github.com`, // Common GitHub no-reply format
                contributions: contributor.contributions, // Provided by the contributors endpoint
                avatarUrl: contributor.avatar_url,
                githubUrl: contributor.html_url,
            };
        });

        const contributors = await Promise.all(contributorDetailsPromises);
        res.json(contributors);

    } catch (error) {
        console.error(`getRepoContributors: Error fetching contributors for ${owner}/${repo}:`, error.message);
        next(error);
    }
};

// ** RESOLVED CONFLICT: Kept functions and helpers from 'main' branch **
// --- Helper Functions for Metrics ---
const formatDateForGrouping = (dateString) => {
  const date = new Date(dateString);
  // Use UTC methods to avoid timezone issues in grouping keys
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0'); // months are 0-indexed
  const day = date.getUTCDate().toString().padStart(2, '0');
  // Consider using ISO week date or a library function for more robust week grouping across year boundaries
  // For simplicity, using month/day here. Adjust if precise weekly grouping is critical.
  // Example using simple month/day:
  return `${year}-${month}-${day}`; // Or use locale string: date.toLocaleDateString(...)
};

const groupByWeek = (prsData, branchEvents) => {
  const groupedData = {};

  // Helper to get the start of the week (e.g., Monday) in UTC
  const getWeekStartDate = (date) => {
    const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
    const diff = date.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to Monday
    const weekStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), diff));
    return weekStart;
  };

  prsData.forEach((item) => {
    const date = new Date(item.date);
    const weekStart = getWeekStartDate(date);
    const weekKey = weekStart.toISOString().split('T')[0]; // YYYY-MM-DD format for consistent key

    if (!groupedData[weekKey]) {
      groupedData[weekKey] = {
        date: weekKey, // Store the start date of the week
        totalPRsMerged: 0,
        branchesCreated: 0,
        timeToMergeTotal: 0,
        mergeCount: 0,
      };
    }

    groupedData[weekKey].totalPRsMerged += 1;
    if (item.timeToMerge !== null) { // Only include valid merge times
        groupedData[weekKey].timeToMergeTotal += item.timeToMerge;
        groupedData[weekKey].mergeCount += 1;
    }
  });

  branchEvents.forEach((event) => {
    const date = new Date(event.created_at);
    const weekStart = getWeekStartDate(date);
     const weekKey = weekStart.toISOString().split('T')[0];

    if (!groupedData[weekKey]) {
      groupedData[weekKey] = {
         date: weekKey,
        totalPRsMerged: 0,
        branchesCreated: 0,
        timeToMergeTotal: 0,
        mergeCount: 0,
      };
    }
    groupedData[weekKey].branchesCreated += 1;
  });

  // Calculate averages after grouping all data
  return Object.values(groupedData).map(week => ({
    ...week,
    avgTimeToMerge:
      week.mergeCount > 0
        ? parseFloat((week.timeToMergeTotal / week.mergeCount).toFixed(1))
        : 0,
    prCount: week.totalPRsMerged, // Keep alias if frontend uses it
    // Remove intermediate calculation fields if not needed by frontend
    // timeToMergeTotal: undefined,
    // mergeCount: undefined,
  }));
};


const getDaysDifference = (dateString1, dateString2) => {
    if (!dateString1 || !dateString2) return null; // Return null if dates are invalid
    try {
        const date1 = new Date(dateString1);
        const date2 = new Date(dateString2);
        const diffTime = Math.abs(date2 - date1);
        if (isNaN(diffTime)) return null; // Handle invalid date strings
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Difference in days
    } catch (e) {
        console.error("Error calculating date difference:", e);
        return null;
    }
};


const getRepoMetrics = async (req, res, next) => {
  const { owner, repo } = req.params;
  // ** RESOLVED CONFLICT: Use accessToken from req object **
  const userAccessToken = req.accessToken;
  const { timeframe = "3months" } = req.query;

  console.log(`getRepoMetrics: Request for ${owner}/${repo}, Timeframe: ${timeframe}`);
  if (!userAccessToken) {
       console.error(`getRepoMetrics: Missing userAccessToken for ${owner}/${repo}.`);
       return next(new AppError("Authentication token missing.", 401));
   }
   console.log(`getRepoMetrics: Using user token starting/ending: ${userAccessToken.substring(0, 4)}...${userAccessToken.slice(-4)}`);

  try {
    const startDate = new Date();
    if (timeframe === "1month") {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (timeframe === "6months") {
      startDate.setMonth(startDate.getMonth() - 6);
    } else { // Default to 3 months
      startDate.setMonth(startDate.getMonth() - 3);
    }
    const startDateString = startDate.toISOString(); // Use ISO format for comparison

    console.log(`getRepoMetrics: Fetching PRs since ${startDateString}`);
    // ** RESOLVED CONFLICT: Use githubApiRequestUser **
    const prsData = await githubApiRequestUser(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      userAccessToken, // Pass user token
      {
        state: "closed",
        sort: "updated",
        direction: "desc",
        per_page: 100, // Consider pagination for very active repos
      }
    );

    // Process PRs within the timeframe
    const processedPRs = prsData
      .filter((pr) => pr.merged_at && new Date(pr.merged_at) >= startDate)
      .map((pr) => ({
        date: pr.merged_at,
        timeToMerge: getDaysDifference(pr.created_at, pr.merged_at), // Calculate diff
      }));

    console.log(`getRepoMetrics: Fetching events since ${startDateString}`);
    // ** RESOLVED CONFLICT: Use githubApiRequestUser **
    const eventsData = await githubApiRequestUser(
      `https://api.github.com/repos/${owner}/${repo}/events`,
      userAccessToken, // Pass user token
      { per_page: 100 } // Consider pagination
    );

    // Filter relevant branch creation events within the timeframe
    const branchEvents = eventsData.filter(
      (event) =>
        event.type === "CreateEvent" &&
        event.payload.ref_type === "branch" &&
        new Date(event.created_at) >= startDate
    );

    // Group data by week
    const weeklyData = groupByWeek(processedPRs, branchEvents);

    // Sort data chronologically by week start date
    weeklyData.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate overall statistics for the period
    const totalPRsMerged = processedPRs.length;
    const totalBranchesCreated = branchEvents.length;
    const validTimeToMergeValues = processedPRs
        .map(pr => pr.timeToMerge)
        .filter(time => time !== null && typeof time === 'number'); // Ensure only valid numbers

    const overallAvgTimeToMerge =
      validTimeToMergeValues.length > 0
        ? parseFloat(
            (
              validTimeToMergeValues.reduce((sum, val) => sum + val, 0) /
              validTimeToMergeValues.length
            ).toFixed(1)
          )
        : 0;

    const response = {
      // Keep both keys if frontend might use either, or simplify to one
      prMergeData: weeklyData.map(w => ({ date: w.date, value: w.totalPRsMerged })),
      branchCreationData: weeklyData.map(w => ({ date: w.date, value: w.branchesCreated })),
      timeToMergeData: weeklyData.map(w => ({ date: w.date, value: w.avgTimeToMerge })),
      // Optionally provide overall stats separately
      totalStats: {
        totalPRsMerged: totalPRsMerged,
        totalBranchesCreated: totalBranchesCreated,
        overallAvgTimeToMerge: overallAvgTimeToMerge,
        timeframeMonths: timeframe.replace('months', '').replace('month', ''), // Pass timeframe back
        startDate: startDateString,
      },
    };

    res.json(response);
  } catch (error) {
     console.error(`getRepoMetrics: Error fetching metrics for ${owner}/${repo}:`, error.message);
    next(error);
  }
};

// ** RESOLVED CONFLICT: Merged exports **
module.exports = {
    getRepoBranches,
    getRepoCommits,
    getRepoMerges,
    getRepoIssues,
    getRepoPR,
    getRepoContributors,
    getRepoMetrics, // Include the function from 'main'
};