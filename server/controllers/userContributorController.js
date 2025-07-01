const axios = require("axios");
const { decryptData } = require("../utils/crypto");
const { AppError } = require("../utils/errorHandler");

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
      throw new AppError(
        `GitHub API error for user request: ${
          data?.message || "Unknown error"
        }`,
        status
      );
    }
    throw new AppError("Failed to reach GitHub API for user request", 503);
  }
};

const getDateRange = (monthParam, repoCreatedDate) => {
  const now = new Date();
  let startDate, endDate;

  if (!monthParam) {
    endDate = new Date(now);
    startDate = new Date(now);
    startDate.setMonth(now.getMonth() - 1);
  } else {
    const currentYear = now.getFullYear();
    let targetMonth, targetYear;

    if (monthParam.includes("-")) {
      const [year, month] = monthParam.split("-");
      targetYear = parseInt(year);
      targetMonth = parseInt(month) - 1;
    } else {
      const monthNames = {
        january: 0,
        jan: 0,
        february: 1,
        feb: 1,
        march: 2,
        mar: 2,
        april: 3,
        apr: 3,
        may: 4,
        june: 5,
        jun: 5,
        july: 6,
        jul: 6,
        august: 7,
        aug: 7,
        september: 8,
        sep: 8,
        october: 9,
        oct: 9,
        november: 10,
        nov: 10,
        december: 11,
        dec: 11,
      };

      targetMonth = monthNames[monthParam.toLowerCase()];
      if (targetMonth === undefined) {
        throw new AppError("Invalid month parameter", 400);
      }
      targetYear = currentYear;
    }

    startDate = new Date(targetYear, targetMonth, 1);
    endDate = new Date(targetYear, targetMonth + 1, 0);
    endDate.setHours(23, 59, 59, 999);
  }

  const repoCreated = new Date(repoCreatedDate);
  if (startDate < repoCreated) {
    startDate = new Date(repoCreated);
  }

  return { startDate, endDate };
};

const getMonthsBetween = (startDate, endDate) => {
  const months =
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth());
  return Math.max(1, months);
};

const getUserContributorActivityOverTime = async (req, res, next) => {
  const { owner, repo, contributor } = req.params;
  const { timeframe } = req.query;
  const userAccessToken = req.accessToken;

  if (!userAccessToken) {
    console.error(
      `getUserContributorActivityOverTime: Missing userAccessToken for ${owner}/${repo}/${contributor}.`
    );
    return next(new AppError("Authentication token missing.", 401));
  }

  try {
    const repoInfo = await githubApiRequestUser(
      `https://api.github.com/repos/${owner}/${repo}`,
      userAccessToken
    );

    // Determine the date range based on the timeframe
    const now = new Date();
    let startDate;
    switch (timeframe) {
      case "1year":
        startDate = new Date(
          now.getFullYear() - 1,
          now.getMonth(),
          now.getDate()
        );
        break;
      case "6months":
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 6);
        break;
      case "3months":
      default:
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 3);
        break;
    }

    const repoCreated = new Date(repoInfo.created_at);
    if (startDate < repoCreated) {
      startDate = new Date(repoCreated);
    }
    const endDate = new Date(now);

    // Fetch branches
    let branches = [];
    try {
      let page = 1;
      while (true) {
        const branchData = await githubApiRequestUser(
          `https://api.github.com/repos/${owner}/${repo}/branches`,
          userAccessToken,
          { per_page: 100, page }
        );
        branches = branches.concat(branchData);
        if (branchData.length < 100) break;
        page++;
      }
    } catch (error) {
      console.warn(
        `Failed to fetch branches for ${owner}/${repo}:`,
        error.message
      );
      branches = [];
    }

    // Fetch commits for each branch to get creation dates
    const branchCreationData = [];
    for (const branch of branches) {
      try {
        const commits = await githubApiRequestUser(
          `https://api.github.com/repos/${owner}/${repo}/commits?sha=${branch.name}`,
          userAccessToken,
          { per_page: 1 }
        );
        if (commits.length > 0) {
          const commitDate = new Date(commits[0].commit.committer.date);
          if (commitDate >= startDate && commitDate <= endDate) {
            branchCreationData.push({
              date: commitDate.toISOString().split("T")[0],
              value: 1,
              branchName: branch.name,
            });
          }
        }
      } catch (error) {
        console.warn(
          `Failed to fetch commits for branch ${branch.name}:`,
          error.message
        );
      }
    }

    // Fetch all PRs for the repository
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

    // Filter PRs by contributor and date range
    const contributorPRs = allPRs.filter((pr) => {
      const prCreatedDate = new Date(pr.created_at);
      const prMergedDate = pr.merged_at ? new Date(pr.merged_at) : null;
      const isContributor = pr.user?.login === contributor;
      const inDateRange =
        (prCreatedDate >= startDate && prCreatedDate <= endDate) ||
        (prMergedDate && prMergedDate >= startDate && prMergedDate <= endDate);
      return isContributor && inDateRange;
    });

    // PR creation data
    const prCreationData = contributorPRs.map((pr) => ({
      date: new Date(pr.created_at).toISOString().split("T")[0],
      value: 1,
    }));

    // PR merge data
    const prMergeData = contributorPRs
      .filter((pr) => pr.merged_at)
      .map((pr) => ({
        date: new Date(pr.merged_at).toISOString().split("T")[0],
        value: 1,
      }));

    // Time to merge data
    const timeToMergeData = contributorPRs
      .filter((pr) => pr.merged_at)
      .map((pr) => {
        const createdAt = new Date(pr.created_at);
        const mergedAt = new Date(pr.merged_at);
        const timeDiff = (mergedAt - createdAt) / (1000 * 60 * 60); // in hours
        return {
          date: mergedAt.toISOString().split("T")[0],
          avgTimeToMerge: Math.round(timeDiff),
        };
      });

    // Calculate overall stats
    const totalPRs = contributorPRs.length;
    const totalPRsMerged = prMergeData.length;
    const totalBranchesCreated = branchCreationData.length;
    const overallAvgTimeToMerge =
      timeToMergeData.length > 0
        ? Math.round(
            timeToMergeData.reduce(
              (sum, item) => sum + item.avgTimeToMerge,
              0
            ) / timeToMergeData.length
          )
        : 0;

    // Prepare response
    const response = {
      contributor: contributor,
      repository: `${owner}/${repo}`,
      timeframe: timeframe || "3months",
      totalStats: {
        totalPRs,
        totalPRsMerged,
        totalBranchesCreated,
        startDate: startDate.toISOString().split("T")[0],
        overallAvgTimeToMerge,
      },
      prCreationData,
      prMergeData,
      branchCreationData,
      timeToMergeData,
    };

    res.json(response);
  } catch (error) {
    console.error(
      `getUserContributorActivityOverTime: Error fetching activity for ${contributor} in ${owner}/${repo}:`,
      error.message
    );
    next(error);
  }
};

const getUserContributorMetrics = async (req, res, next) => {
  const { owner, repo, contributor } = req.params;
  const { month } = req.query;
  const userAccessToken = req.accessToken;

  if (!userAccessToken) {
    console.error(
      `getPersonalContributorMetrics: Missing userAccessToken for ${owner}/${repo}/${contributor}.`
    );
    return next(new AppError("Authentication token missing.", 401));
  }

  try {
    // Get repository information
    const repoInfo = await githubApiRequestUser(
      `https://api.github.com/repos/${owner}/${repo}`,
      userAccessToken
    );

    // Get date range based on month parameter
    const { startDate, endDate } = getDateRange(month, repoInfo.created_at);

    // Fetch all PRs for the repository
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

    // Filter PRs by contributor and date range
    const contributorPRs = allPRs.filter((pr) => {
      const prCreatedDate = new Date(pr.created_at);
      const prMergedDate = pr.merged_at ? new Date(pr.merged_at) : null;
      const isContributor = pr.user?.login === contributor;
      const inDateRange =
        (prCreatedDate >= startDate && prCreatedDate <= endDate) ||
        (prMergedDate && prMergedDate >= startDate && prMergedDate <= endDate);

      return isContributor && inDateRange;
    });

    // Filter merged PRs
    const mergedPRs = contributorPRs.filter((pr) => pr.merged_at);
    const totalPRsMerged = mergedPRs.length;
    const monthsInRange = getMonthsBetween(startDate, endDate);
    const avgPRsPerMonth =
      monthsInRange > 0 ? (totalPRsMerged / monthsInRange).toFixed(2) : 0;

    let avgTimeToMerge = 0;
    if (mergedPRs.length > 0) {
      const totalMergeTime = mergedPRs.reduce((sum, pr) => {
        const createdAt = new Date(pr.created_at);
        const mergedAt = new Date(pr.merged_at);
        const timeDiff = (mergedAt - createdAt) / (1000 * 60 * 60);
        return sum + timeDiff;
      }, 0);
      avgTimeToMerge = Math.round(totalMergeTime / mergedPRs.length);
    }

    // Format time function
    const formatTime = (hours) => {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.floor(hours % 24);
      const minutes = Math.floor((hours % 1) * 60);
      return `${days.toString().padStart(2, "0")}days/${remainingHours
        .toString()
        .padStart(2, "0")}hr/${minutes.toString().padStart(2, "0")}min`;
    };

    // Calculate Number of Reviews Performed
    let reviewsPerformed = 0;
    const allPRsInRange = allPRs.filter((pr) => {
      const prCreatedDate = new Date(pr.created_at);
      return prCreatedDate >= startDate && prCreatedDate <= endDate;
    });

    for (const pr of allPRsInRange) {
      try {
        const reviews = await githubApiRequestUser(
          `https://api.github.com/repos/${owner}/${repo}/pulls/${pr.number}/reviews`,
          userAccessToken
        );

        const contributorReviews = reviews.filter(
          (review) =>
            review.user?.login === contributor && review.state !== "PENDING"
        );

        reviewsPerformed += contributorReviews.length;
      } catch (error) {
        console.warn(
          `Failed to fetch reviews for PR #${pr.number}:`,
          error.message
        );
      }
    }

    // Calculate Code Churn Rate (Lines Added + Lines Deleted)
    let totalLinesAdded = 0;
    let totalLinesDeleted = 0;
    let codeChurnRate = 0;

    for (const pr of contributorPRs) {
      try {
        let prFiles = [];
        let filePage = 1;

        while (true) {
          const files = await githubApiRequestUser(
            `https://api.github.com/repos/${owner}/${repo}/pulls/${pr.number}/files`,
            userAccessToken,
            { per_page: 100, page: filePage }
          );
          prFiles = prFiles.concat(files);
          if (files.length < 100) break;
          filePage++;
        }

        const prAdditions = prFiles.reduce(
          (sum, file) => sum + (file.additions || 0),
          0
        );
        const prDeletions = prFiles.reduce(
          (sum, file) => sum + (file.deletions || 0),
          0
        );

        totalLinesAdded += prAdditions;
        totalLinesDeleted += prDeletions;
      } catch (error) {
        console.warn(
          `Failed to fetch files for PR #${pr.number}:`,
          error.message
        );
      }
    }

    codeChurnRate = totalLinesAdded + totalLinesDeleted;

    // Prepare response
    const response = {
      contributor: contributor,
      repository: `${owner}/${repo}`,
      dateRange: {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        monthsInRange: monthsInRange,
      },
      metrics: {
        prsMetrics: {
          totalPRsMerged: totalPRsMerged,
          avgPRsPerMonth: parseFloat(avgPRsPerMonth),
        },
        avgTimeToMerge: {
          hours: avgTimeToMerge,
          formatted: formatTime(avgTimeToMerge),
        },
        reviewsPerformed: reviewsPerformed,
        codeChurnRate: {
          total: codeChurnRate,
          linesAdded: totalLinesAdded,
          linesDeleted: totalLinesDeleted,
        },
      },
      additionalInfo: {
        totalPRsCreated: contributorPRs.length,
        openPRs: contributorPRs.filter((pr) => pr.state === "open").length,
        closedPRs: contributorPRs.filter(
          (pr) => pr.state === "closed" && !pr.merged_at
        ).length,
      },
    };

    res.json(response);
  } catch (error) {
    console.error(
      `getPersonalContributorMetrics: Error fetching metrics for ${contributor} in ${owner}/${repo}:`,
      error.message
    );
    next(error);
  }
};

module.exports = {
  getUserContributorMetrics,
  getUserContributorActivityOverTime,
};
