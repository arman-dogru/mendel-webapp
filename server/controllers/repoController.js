// server/controllers/repoController.js

const axios = require("axios");
const { decryptData } = require("../utils/crypto");
const { AppError } = require("../utils/errorHandler");
const githubAppService = require('../services/githubAppService'); // Import App Service

// --- Helper for GitHub API Requests (USING USER OAUTH TOKEN) ---
// This remains largely the same, using the explicit token from the session
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
  // Get the user access token attached by the checkAuth middleware
  const userAccessToken = req.accessToken;

  // --- *** ADDED LOGGING *** ---
  console.log(`getRepoBranches: Request for ${owner}/${repo}`);
  if (!userAccessToken) {
      console.error(`getRepoBranches: Missing userAccessToken in request for ${owner}/${repo}. Session might be invalid or checkAuth middleware failed.`);
      return next(new AppError("Authentication token missing.", 401));
  }
  // Log only the start/end to avoid exposing full token
  console.log(`getRepoBranches: Using user token starting with ${userAccessToken.substring(0, 4)}... ending with ...${userAccessToken.slice(-4)}`);
  // --- *** END LOGGING *** ---

  try {
    // Use the helper function designed for user tokens
    const data = await githubApiRequestUser(
      `https://api.github.com/repos/${owner}/${repo}/branches`,
      userAccessToken // Pass the specific user token
    );
    const branches = data.map((branch) => ({
      name: branch.name,
      commit: branch.commit.sha,
    }));

    res.json(branches);
  } catch (error) {
    // Log the specific error before passing it to the global handler
    console.error(`getRepoBranches: Error fetching branches for ${owner}/${repo}:`, error.message);
    next(error); // Pass error to the global error handler
  }
};

const getRepoCommits = async (req, res, next) => {
  const { owner, repo } = req.params;
  const { branch } = req.query;
  const userAccessToken = req.accessToken; // From checkAuth

  // --- Logging ---
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
  // --- End Logging ---

  try {
    // Use the user token helper
    const data = await githubApiRequestUser(
      `https://api.github.com/repos/${owner}/${repo}/commits`,
      userAccessToken, // Pass user token
      { sha: branch } // Pass branch as query param correctly
    );
    const commits = data.map((commit) => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author?.name || 'Unknown', // Handle potential missing author name
      date: commit.commit.author?.date, // Handle potential missing author date
      branch: branch, // Include branch info
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
             { state: 'closed', per_page: 100 } // Fetch closed PRs
        );
        const merges = data
            .filter((pr) => pr.merged_at) // Filter only those that were merged
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
    const { state = "open" } = req.query; // Default to 'open' issues
    const userAccessToken = req.accessToken;

     console.log(`getRepoIssues: Request for ${owner}/${repo}, State: ${state}`);
      if (!userAccessToken) {
          console.error(`getRepoIssues: Missing userAccessToken for ${owner}/${repo}.`);
          return next(new AppError("Authentication token missing.", 401));
      }
       console.log(`getRepoIssues: Using user token starting/ending: ${userAccessToken.substring(0, 4)}...${userAccessToken.slice(-4)}`);

    try {
        // Fetch issues (potentiall includes PRs, need to filter)
        const data = await githubApiRequestUser(
            `https://api.github.com/repos/${owner}/${repo}/issues`,
            userAccessToken,
            { state: state, per_page: 100 }
        );

        // Filter out pull requests, as the issues endpoint returns both
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
    const userAccessToken = req.accessToken; // User's token
    const encryptedUsername = req.session.encryptedUsername; // Get current user for categorization
    const currentUser = encryptedUsername ? decryptData(encryptedUsername) : null;
    const { branch } = req.query; // Optional base branch filter

    console.log(`getRepoPR: Request for ${owner}/${repo}, Base Branch Filter: ${branch || 'any'}`);
    if (!userAccessToken) {
        console.error(`getRepoPR: Missing userAccessToken for ${owner}/${repo}.`);
        return next(new AppError("Authentication token missing.", 401));
    }
     console.log(`getRepoPR: Using user token starting/ending: ${userAccessToken.substring(0, 4)}...${userAccessToken.slice(-4)}`);
    if (!currentUser) {
        // This case might happen if session got cleared but middleware didn't catch it? Unlikely.
         console.error(`getRepoPR: Could not decrypt username from session for ${owner}/${repo}.`);
        return next(new AppError("User context missing, please log in again.", 401));
    }

    try {
        // Fetch all PRs (open and closed) for the repo, optionally filtered by base branch
        const prParams = { state: "all", per_page: 100 };
        if (branch) {
            prParams.base = branch;
        }
        const prData = await githubApiRequestUser(
            `https://api.github.com/repos/${owner}/${repo}/pulls`,
            userAccessToken,
            prParams
        );

        // OPTIONAL: Fetch comments count efficiently (consider removing if not strictly needed or if performance is an issue)
        // const commentFetchPromises = prData.map(pr =>
        //     githubApiRequestUser(
        //         `https://api.github.com/repos/${owner}/${repo}/issues/${pr.number}/comments`,
        //         userAccessToken,
        //         { per_page: 1 } // Just need to know if there are any comments, get 1 to check count
        //     ).then(comments => comments.length) // Or use the comment_count from the PR list API if available
        //      .catch(err => {
        //           console.warn(`Failed to fetch comments for PR #${pr.number}: ${err.message}`);
        //           return 0; // Default to 0 comments on error
        //      })
        // );
        // const commentCounts = await Promise.all(commentFetchPromises);

        const prs = prData.map((pr, index) => ({
            id: pr.number,
            title: pr.title,
            createdAt: pr.created_at,
            author: pr.user?.login || 'Unknown',
            status: pr.state, // 'open', 'closed'
            labels: pr.labels.map((label) => label.name),
            // comments: commentCounts[index], // Use fetched counts if enabled
            comments: pr.comments, // Use count from PR list API (check if field exists)
            review_comments: pr.review_comments, // Use count from PR list API (check if field exists)
            mergedAt: pr.merged_at, // null if not merged
            requestedReviewers: pr.requested_reviewers
                ? pr.requested_reviewers.map((reviewer) => reviewer.login)
                : [],
            baseBranch: pr.base.ref,
            headBranch: pr.head.ref,
            url: pr.html_url,
        }));

        // --- Categorization Logic (as before) ---
        const categorizedPRs = {
            open: [],
            needsYourReview: [], // PRs assigned to the current user or requesting their review
            waitingForAuthor: [], // PRs opened by the current user that have activity/comments
            closed: [], // Closed but not merged
            merged: [], // Closed and merged
        };

        prs.forEach((pr) => {
            const isMerged = !!pr.mergedAt;
            const isOpen = pr.status === 'open';
            const isAuthor = pr.author === currentUser;
            // Note: The base 'pulls' endpoint doesn't list *detailed* review status per user.
            // 'requestedReviewers' only lists *pending* requests.
            // Determining "Needs Your Review" accurately often requires fetching review details separately per PR, which is expensive.
            // We'll use a simplified logic here: open PRs not by the current user potentially need review.
             const mayNeedReview = pr.requestedReviewers.includes(currentUser); // Basic check

            if (isOpen) {
                categorizedPRs.open.push(pr);
                if (isAuthor && (pr.comments > 0 || pr.review_comments > 0)) { // If author and has comments
                    categorizedPRs.waitingForAuthor.push(pr);
                } else if (mayNeedReview) { // If assigned to current user
                     categorizedPRs.needsYourReview.push(pr);
                }
                // Open PRs by others not explicitly assigned might also need review,
                // but we avoid putting everything in 'needsYourReview' without better logic.

            } else { // Closed
                if (isMerged) {
                    categorizedPRs.merged.push(pr);
                } else {
                    categorizedPRs.closed.push(pr);
                }
            }
        });
        // --- End Categorization ---

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
                userDetail = await githubApiRequestUser(
                    contributor.url, // Use the user API URL from the contributor data
                     userAccessToken
                 );
            } catch (userFetchError) {
                 console.warn(`Failed to fetch user details for ${contributor.login}: ${userFetchError.message}`);
            }

             // Optional: Fetch PR count (can be slow if many contributors)
            // let prCount = 0;
            // try {
            //      const prsData = await githubApiRequestUser(
            //          `https://api.github.com/repos/${owner}/${repo}/pulls`,
            //          userAccessToken,
            //          { state: 'all', creator: contributor.login, per_page: 1 } // Just need count
            //      );
            //      // NOTE: GitHub List PRs API doesn't return total count directly in headers easily accessible via basic Axios.
            //      // A search query might be better for counts: `https://api.github.com/search/issues?q=repo:${owner}/${repo}+is:pr+author:${contributor.login}`
            //      // For simplicity, we'll stick to contributions count from the initial list for now.
            // } catch (prFetchError) {
            //      console.warn(`Failed to fetch PR count for ${contributor.login}: ${prFetchError.message}`);
            // }


            return {
                name: contributor.login,
                // Use email from user details if available and public, otherwise fallback
                email: userDetail?.email || `${contributor.login}@users.noreply.github.com`, // Common GitHub no-reply format
                contributions: contributor.contributions, // Provided by the contributors endpoint
                // totalPRs: prCount, // Add if PR count fetching is implemented reliably
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


module.exports = {
    getRepoBranches,
    getRepoCommits,
    getRepoMerges,
    getRepoIssues,
    getRepoPR,
    getRepoContributors,
};