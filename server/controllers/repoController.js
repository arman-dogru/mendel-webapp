// server/controllers/repoController.js

const axios = require("axios");
const { decryptData } = require("../utils/crypto");
const { AppError } = require("../utils/errorHandler");
const githubAppService = require("../services/githubAppService");

// --- Helper for GitHub API Requests (USING USER OAUTH TOKEN) ---
const githubApiRequestUser = async (url, accessToken, params = {}) => {
  if (!accessToken) {
    console.error("githubApiRequestUser: accessToken is missing!");
    throw new AppError("Authentication token is missing for user request", 401);
  }
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      params,
    });
    return response.data;
  } catch (error) {
    console.error(`githubApiRequestUser: Error calling ${url}`, error.message);
    if (axios.isAxiosError(error) && error.response) {
      const { status, data } = error.response;
      console.error(
        `GitHub API Error (${status}) for user request:`,
        data?.message || data
      );
      if (status === 401) {
        throw new AppError(
          "GitHub API: Bad credentials or insufficient permissions (User Token).",
          401
        );
      }
      if (status === 403) {
        throw new AppError(
          "GitHub API: Forbidden. Check user token permissions or API rate limits.",
          403
        );
      }
      if (status === 404) {
        throw new AppError(
          "GitHub API: Resource not found. Check owner/repo name or user token permissions.",
          404
        );
      }
      if (status === 429) {
        throw new AppError("GitHub API: Rate limit exceeded.", 429);
      }
      // Generic error for other statuses
      throw new AppError(
        `GitHub API error for user request: ${
          data?.message || "Unknown error"
        }`,
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
  if (!userAccessToken) {
    console.error(
      `getRepoBranches: Missing userAccessToken in request for ${owner}/${repo}.`
    );
    return next(new AppError("Authentication token missing.", 401));
  }
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
    console.error(
      `getRepoBranches: Error fetching branches for ${owner}/${repo}:`,
      error.message
    );
    next(error);
  }
};

const getRepoCommits = async (req, res, next) => {
  const { owner, repo } = req.params;
  const { branch } = req.query;
  const userAccessToken = req.accessToken;
  if (!userAccessToken) {
    console.error(
      `getRepoCommits: Missing userAccessToken for ${owner}/${repo}.`
    );
    return next(new AppError("Authentication token missing.", 401));
  }
  if (!branch) {
    console.warn(
      `getRepoCommits: Branch name query parameter is missing for ${owner}/${repo}.`
    );
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
      author: commit.commit.author?.name || "Unknown",
      date: commit.commit.author?.date,
      branch: branch,
      parents: commit.parents.map((parent) => parent.sha),
    }));
    res.json(commits);
  } catch (error) {
    console.error(
      `getRepoCommits: Error fetching commits for ${owner}/${repo}, branch ${branch}:`,
      error.message
    );
    next(error);
  }
};

const getRepoMerges = async (req, res, next) => {
  const { owner, repo } = req.params;
  const userAccessToken = req.accessToken;
  if (!userAccessToken) {
    console.error(
      `getRepoMerges: Missing userAccessToken for ${owner}/${repo}.`
    );
    return next(new AppError("Authentication token missing.", 401));
  }
  try {
    const data = await githubApiRequestUser(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      userAccessToken,
      { state: "closed", per_page: 100 }
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
    console.error(
      `getRepoMerges: Error fetching merges for ${owner}/${repo}:`,
      error.message
    );
    next(error);
  }
};

const getRepoIssues = async (req, res, next) => {
  const { owner, repo } = req.params;
  const { state = "open" } = req.query;
  const userAccessToken = req.accessToken;
  if (!userAccessToken) {
    console.error(
      `getRepoIssues: Missing userAccessToken for ${owner}/${repo}.`
    );
    return next(new AppError("Authentication token missing.", 401));
  }
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
        author: issue.user?.login || "Unknown",
        status: issue.state,
        labels: issue.labels.map((label) => label.name),
        comments: issue.comments,
        url: issue.html_url,
      }));
    res.json(issues);
  } catch (error) {
    console.error(
      `getRepoIssues: Error fetching issues for ${owner}/${repo}, state ${state}:`,
      error.message
    );
    next(error);
  }
};

const getRepoPR = async (req, res, next) => {
  const { owner, repo } = req.params;
  const userAccessToken = req.accessToken;
  const encryptedUsername = req.session.encryptedUsername;
  const currentUser = encryptedUsername ? decryptData(encryptedUsername) : null;
  const { branch } = req.query;
  if (!userAccessToken) {
    console.error(`getRepoPR: Missing userAccessToken for ${owner}/${repo}.`);
    return next(new AppError("Authentication token missing.", 401));
  }
  if (!currentUser) {
    console.error(
      `getRepoPR: Could not decrypt username from session for ${owner}/${repo}.`
    );
    return next(
      new AppError("User context missing, please log in again.", 401)
    );
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
    const hasAnyComments = async (prNumber) => {
      try {
        const issueComments = await githubApiRequestUser(
          `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`,
          userAccessToken
        );

        const reviewComments = await githubApiRequestUser(
          `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/comments`,
          userAccessToken
        );

        return issueComments.length > 0 || reviewComments.length > 0;
      } catch (error) {
        console.warn(
          `Failed to fetch comments for PR #${prNumber}:`,
          error.message
        );
        return false;
      }
    };

    const prs = prData.map((pr, index) => ({
      id: pr.number,
      title: pr.title,
      createdAt: pr.created_at,
      author: pr.user?.login || "Unknown",
      body: pr.body,
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
      merged: [],
      waitingForAuthor: [],
      needsYourReview: [],
    };
    for (const pr of prs) {
      const isMerged = !!pr.mergedAt;
      const isOpen = pr.status === "open";

      if (isOpen) {
        const hasComments = await hasAnyComments(pr.id);

        if (hasComments) {
          categorizedPRs.waitingForAuthor.push(pr);
        } else {
          categorizedPRs.needsYourReview.push(pr);
        }
      } else {
        categorizedPRs.merged.push(pr);
      }
    }

    res.json(categorizedPRs);
  } catch (error) {
    console.error(
      `getRepoPR: Error fetching PRs for ${owner}/${repo}:`,
      error.message
    );
    next(error);
  }
};
const getRepoContributors = async (req, res, next) => {
  const { owner, repo } = req.params;
  const userAccessToken = req.accessToken;

  if (!userAccessToken) {
    console.error(
      `getRepoContributors: Missing userAccessToken for ${owner}/${repo}.`
    );
    return next(new AppError("Authentication token missing.", 401));
  }
  try {
    let contributorsData = [];
    let page = 1;
    while (true) {
      const data = await githubApiRequestUser(
        `https://api.github.com/repos/${owner}/${repo}/contributors`,
        userAccessToken,
        { per_page: 100, page }
      );
      contributorsData = contributorsData.concat(data);
      if (data.length < 100) break;
      page++;
    }
    const contributorDetailsPromises = contributorsData.map(
      async (contributor) => {
        if (!contributor.login || !contributor.url) {
          console.warn(
            `Skipping invalid contributor: ${JSON.stringify(contributor)}`
          );
          return null;
        }
        let userDetail = null;
        try {
          userDetail = await githubApiRequestUser(
            contributor.url,
            userAccessToken
          );
        } catch (userFetchError) {
          console.warn(
            `Failed to fetch user details for ${contributor.login}: ${userFetchError.message}`
          );
        }
        let prCount = 0;
        try {
          let pullsData = [];
          let prPage = 1;
          while (true) {
            const data = await githubApiRequestUser(
              `https://api.github.com/repos/${owner}/${repo}/pulls`,
              userAccessToken,
              {
                state: "all",
                per_page: 100,
                page: prPage,
              }
            );
            pullsData = pullsData.concat(data);
            if (data.length < 100) break;
            prPage++;
          }
          prCount = pullsData.filter(
            (pr) => pr.user?.login === contributor.login
          ).length;
        } catch (prFetchError) {
          console.warn(
            `Failed to fetch PR count for ${contributor.login}: ${prFetchError.message}`
          );
        }

        return {
          name: contributor.login,
          contributions: contributor.contributions,
          totalPRs: prCount,
          avatarUrl: contributor.avatar_url,
          githubUrl: contributor.html_url,
        };
      }
    );
    const contributors = (await Promise.all(contributorDetailsPromises)).filter(
      (contributor) => contributor !== null
    );
    contributors.sort((a, b) => b.contributions - a.contributions);

    res.json(contributors);
  } catch (error) {
    console.error(
      `getRepoContributors: Error fetching contributors for ${owner}/${repo}:`,
      error.message
    );
    next(error);
  }
};

const getRepoMetricsHelper = async (owner, repo, userAccessToken) => {
  try {
    let allPRs = [];
    let page = 1;
    while (true) {
      const prs = await githubApiRequestUser(
        `https://api.github.com/repos/${owner}/${repo}/pulls`,
        userAccessToken,
        { state: "all", per_page: 100, page }
      );
      allPRs = allPRs.concat(prs);
      if (prs.length < 100) break;
      page++;
    }
    const mergedPRs = allPRs.filter((pr) => pr.merged_at);
    const openPRs = allPRs.filter((pr) => pr.state === "open");
    let overallAvgTimeToMerge = 0;
    if (mergedPRs.length > 0) {
      const totalMergeTime = mergedPRs.reduce((sum, pr) => {
        const createdAt = new Date(pr.created_at);
        const mergedAt = new Date(pr.merged_at);
        const timeDiff = (mergedAt - createdAt) / (1000 * 60 * 60);
        return sum + timeDiff;
      }, 0);
      overallAvgTimeToMerge = Math.round(totalMergeTime / mergedPRs.length);
    }

    let totalCommentResponseTime = 0;
    let prWithCommentsCount = 0;
    const now = new Date();

    for (const pr of allPRs) {
      try {
        const comments = await githubApiRequestUser(
          `https://api.github.com/repos/${owner}/${repo}/issues/${pr.number}/comments`,
          userAccessToken
        );

        const prCreatedAt = new Date(pr.created_at);
        const prAuthor = pr.user.login;

        const nonAuthorComments = comments.filter(
          (comment) => comment.user.login !== prAuthor
        );

        if (nonAuthorComments.length > 0) {
          const firstCommentAt = new Date(nonAuthorComments[0].created_at);
          const timeDiff = (firstCommentAt - prCreatedAt) / (1000 * 60 * 60);
          totalCommentResponseTime += timeDiff;
          prWithCommentsCount++;
        } else {
          const timeDiff = (now - prCreatedAt) / (1000 * 60 * 60);
          totalCommentResponseTime += timeDiff;
          prWithCommentsCount++;
        }
      } catch (error) {
        console.warn(
          `[HELPER] Failed to fetch comments for PR #${pr.number}:`,
          error.message
        );
      }
    }

    const avgTimeToAddressPRComments =
      prWithCommentsCount > 0
        ? Math.round(totalCommentResponseTime / prWithCommentsCount)
        : 0;

    const formatTime = (hours) => {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.floor(hours % 24);
      const minutes = Math.floor((hours % 1) * 60);
      return `${days.toString().padStart(2, "0")}days/${remainingHours
        .toString()
        .padStart(2, "0")}hr/${minutes.toString().padStart(2, "0")}min`;
    };

    const helperResult = {
      averageTimeToAddressPRComments: formatTime(avgTimeToAddressPRComments),
      overallAvgTimeToMerge,
      totalOpenPRs: openPRs.length,
      totalPRsMerged: mergedPRs.length,
    };
    return helperResult;
  } catch (error) {
    console.error(
      `[HELPER ERROR] Error in helper function for ${owner}/${repo}:`,
      error.message
    );
    throw error;
  }
};

// server/controllers/repoController.js (at the end of the file)

// CORRECTED FUNCTION: getPRDetails
const getPRDetails = async (req, res, next) => {
    const { owner, repo, prNumber } = req.params;
    const userAccessToken = req.accessToken;

    if (!userAccessToken) {
        return next(new AppError("Authentication token missing.", 401));
    }

    try {
        // 1. Get standard PR data (which includes the body) - this part is fine
        const prData = await githubApiRequestUser(
            `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
            userAccessToken
        );

        // 2. Get the PR diff using a direct axios call with the correct header
        const diffResponse = await axios.get(
            `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
            {
                headers: {
                    Authorization: `Bearer ${userAccessToken}`,
                    Accept: 'application/vnd.github.v3.diff' // Use the specific 'diff' media type
                }
            }
        );
        const diff = diffResponse.data;

        // 3. Combine and send response
        const prDetails = {
            ...prData, // All original PR data from the first call
            diff: diff  // Add the diff from the second call
        };

        res.json(prDetails);

    } catch (error) {
        console.error(`Error fetching details for PR #${prNumber}:`, error.message);
        // Pass the error to the global error handler
        if (error.isAxiosError && error.response) {
            next(new AppError(error.response.data.message || 'GitHub API error', error.response.status));
        } else {
            next(error);
        }
    }
};

const getRepoMetrics = async (req, res, next) => {
  const { owner, repo } = req.params;
  const userAccessToken = req.accessToken;
  const { timeframe = "3months" } = req.query;

  if (!userAccessToken) {
    console.error(
      `[MAIN] getRepoMetrics: Missing userAccessToken for ${owner}/${repo}.`
    );
    return next(new AppError("Authentication token missing.", 401));
  }

  try {
    const helperMetrics = await getRepoMetricsHelper(
      owner,
      repo,
      userAccessToken
    );
    const repoInfo = await githubApiRequestUser(
      `https://api.github.com/repos/${owner}/${repo}`,
      userAccessToken
    );
    const now = new Date();
    const timeframeMonths =
      timeframe === "1year" ? 12 : timeframe === "6months" ? 6 : 3;
    const startDate = new Date(now);
    startDate.setMonth(now.getMonth() - timeframeMonths);

    let allPRs = [];
    let page = 1;
    while (true) {
      const prs = await githubApiRequestUser(
        `https://api.github.com/repos/${owner}/${repo}/pulls`,
        userAccessToken,
        { state: "all", per_page: 100, page }
      );
      allPRs = allPRs.concat(prs);
      if (prs.length < 100) break;
      page++;
    }

    let allBranches = [];
    page = 1;
    while (true) {
      const branches = await githubApiRequestUser(
        `https://api.github.com/repos/${owner}/${repo}/branches`,
        userAccessToken,
        { per_page: 100, page }
      );
      allBranches = allBranches.concat(branches);
      if (branches.length < 100) break;
      page++;
    }
    const filteredPRs = allPRs.filter((pr) => {
      const prCreatedDate = new Date(pr.created_at);
      const prMergedDate = pr.merged_at ? new Date(pr.merged_at) : null;
      return (
        prCreatedDate >= startDate ||
        (prMergedDate && prMergedDate >= startDate)
      );
    });
    const mergedPRs = filteredPRs.filter((pr) => pr.merged_at);
    const openPRs = filteredPRs.filter((pr) => pr.state === "open");
    const branchCreationsByDate = {};
    for (const branch of allBranches) {
      try {
        const commit = await githubApiRequestUser(
          `https://api.github.com/repos/${owner}/${repo}/commits/${branch.commit.sha}`,
          userAccessToken
        );
        const commitDate = commit.commit.author.date.split("T")[0];
        const commitDateTime = new Date(commit.commit.author.date);
        if (commitDateTime >= startDate) {
          branchCreationsByDate[commitDate] =
            (branchCreationsByDate[commitDate] || 0) + 1;
        }
      } catch (error) {
        console.warn(
          `[MAIN] Failed to fetch commit for branch ${branch.name}:`,
          error.message
        );
      }
    }

    const totalPRs = filteredPRs.length;
    const totalMergedPRs = mergedPRs.length;
    const totalOpenPRs = openPRs.length;
    const totalBranchesCreated = Object.values(branchCreationsByDate).reduce(
      (sum, count) => sum + count,
      0
    );
    let overallAvgTimeToMerge = 0;
    if (mergedPRs.length > 0) {
      const totalMergeTime = mergedPRs.reduce((sum, pr) => {
        const createdAt = new Date(pr.created_at);
        const mergedAt = new Date(pr.merged_at);
        const timeDiff = (mergedAt - createdAt) / (1000 * 60 * 60);
        return sum + timeDiff;
      }, 0);
      overallAvgTimeToMerge = Math.round(totalMergeTime / mergedPRs.length);
    }
    const prMergeData = [];
    const prCreationData = [];
    const branchCreationData = [];
    const timeToMergeData = [];

    const mergedPRsByDate = {};
    mergedPRs.forEach((pr) => {
      const mergeDate = pr.merged_at.split("T")[0];
      mergedPRsByDate[mergeDate] = (mergedPRsByDate[mergeDate] || 0) + 1;
    });

    const createdPRsByDate = {};
    filteredPRs.forEach((pr) => {
      const createDate = pr.created_at.split("T")[0];
      createdPRsByDate[createDate] = (createdPRsByDate[createDate] || 0) + 1;
    });

    Object.entries(mergedPRsByDate).forEach(([date, value]) => {
      prMergeData.push({ date, value });
    });

    Object.entries(createdPRsByDate).forEach(([date, value]) => {
      prCreationData.push({ date, value });
    });

    Object.entries(branchCreationsByDate).forEach(([date, value]) => {
      branchCreationData.push({ date, value });
    });

    mergedPRs.forEach((pr) => {
      if (pr.merged_at) {
        timeToMergeData.push({
          branchName: pr.head.ref,
          date: pr.merged_at.split("T")[0],
        });
      }
    });

    [prMergeData, prCreationData, branchCreationData, timeToMergeData].forEach(
      (arr) => {
        arr.sort((a, b) => new Date(a.date) - new Date(b.date));
      }
    );
    const response = {
      prMergeData,
      prCreationData,
      branchCreationData,
      timeToMergeData,
      totalStats: {
        totalPRs,
        totalPRsMerged: totalMergedPRs,
        totalOpenPRs,
        totalBranchesCreated,
        timeframeMonths,
        startDate: repoInfo.created_at,
        overallAvgTimeToMerge,
      },
      allTimeMetrics: {
        averageTimeToAddressPRComments:
          helperMetrics.averageTimeToAddressPRComments,
        overallAvgTimeToMerge: helperMetrics.overallAvgTimeToMerge,
        totalOpenPRs: helperMetrics.totalOpenPRs,
        totalPRsMerged: helperMetrics.totalPRsMerged,
      },
    };

    res.json(response);
  } catch (error) {
    console.error(
      `[MAIN ERROR] getRepoMetrics: Error fetching metrics for ${owner}/${repo}:`,
      error.message
    );
    next(error);
  }
};
const getPRComments = async (req, res, next) => {
  const { owner, repo, prNumber } = req.params;
  const userAccessToken = req.accessToken;

  if (!userAccessToken) {
    console.error(
      `getPRComments: Missing userAccessToken for ${owner}/${repo}/pull/${prNumber}.`
    );
    return next(new AppError("Authentication token missing.", 401));
  }

  try {
    let commentsData = [];
    let page = 1;
    while (true) {
      const data = await githubApiRequestUser(
        `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`,
        userAccessToken,
        { per_page: 100, page }
      );
      commentsData = commentsData.concat(data);
      if (data.length < 100) break;
      page++;
    }

    const comments = commentsData.map((comment) => ({
      id: comment.id,
      body: comment.body,
      author: comment.user?.login || "Unknown",
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      url: comment.html_url,
    }));

    res.json(comments);
  } catch (error) {
    console.error(
      `getPRComments: Error fetching comments for ${owner}/${repo}/pull/${prNumber}:`,
      error.message
    );
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
  getRepoMetrics,
  getPRComments,
  getPRDetails,
};
