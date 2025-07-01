const axios = require("axios");
const { AppError } = require("../utils/errorHandler");

/**
 * Developer Impact Score Controller - Real GitHub Data Implementation
 * Calculates individual developer impact score with letter grading
 * Uses actual GitHub API data for all calculations
 */

// Scoring configuration
const SCORING_CONFIG = {
  categories: {
    contribution: {
      weight: 35,
      metrics: {
        commits_per_week: {
          weight: 10,
          expected_range: [3, 15],
          scoring_rule: "linear",
        },
        files_touched: {
          weight: 5,
          expected_range: [10, 100],
          scoring_rule: "log",
        },
        feature_prs: {
          weight: 10,
          expected_range: [2, 10],
          scoring_rule: "linear",
        },
        code_ownership_ratio: {
          weight: 10,
          expected_range: [30, 80],
          scoring_rule: "bell",
        },
      },
    },
    collaboration: {
      weight: 30,
      metrics: {
        review_comments_given: {
          weight: 10,
          expected_range: [5, 25],
          scoring_rule: "linear",
        },
        review_comments_received: {
          weight: 5,
          expected_range: [1, 10],
          scoring_rule: "bell",
        },
        review_participation_rate: {
          weight: 10,
          expected_range: [20, 80],
          scoring_rule: "linear",
        },
        avg_response_time_to_reviews: {
          weight: 5,
          expected_range: [1, 48],
          scoring_rule: "inverse-linear",
        },
      },
    },
    delivery: {
      weight: 25,
      metrics: {
        lead_time_for_changes: {
          weight: 10,
          expected_range: [1, 48],
          scoring_rule: "inverse-log",
        },
        pr_size_variance: {
          weight: 5,
          expected_range: [0, 500],
          scoring_rule: "inverse",
        },
        merge_frequency: {
          weight: 5,
          expected_range: [2, 10],
          scoring_rule: "linear",
        },
        issue_closure_rate: {
          weight: 5,
          expected_range: [60, 100],
          scoring_rule: "linear",
        },
      },
    },
    code_quality: {
      weight: 10,
      metrics: {
        churn_rate: {
          weight: 5,
          expected_range: [0, 10],
          scoring_rule: "inverse",
        },
        reopen_rate: {
          weight: 2.5,
          expected_range: [0, 5],
          scoring_rule: "inverse",
        },
        failed_pr_ratio: {
          weight: 2.5,
          expected_range: [0, 10],
          scoring_rule: "inverse",
        },
      },
    },
  },
  performance_bands: {
    "A+": { min: 95, max: 100 },
    A: { min: 87, max: 94 },
    "A-": { min: 80, max: 86 },
    "B+": { min: 77, max: 79 },
    B: { min: 73, max: 76 },
    "B-": { min: 70, max: 72 },
    "C+": { min: 67, max: 69 },
    C: { min: 63, max: 66 },
    "C-": { min: 60, max: 62 },
    D: { min: 40, max: 59 },
    F: { min: 0, max: 39 },
  },
};

/**
 * Helper function to get days for a specific month
 */
function getSpecificMonthDays(monthIndex, year = null) {
  const currentYear = year || new Date().getFullYear();
  const month = new Date(currentYear, monthIndex, 1);
  const nextMonth = new Date(currentYear, monthIndex + 1, 1);
  return Math.ceil((nextMonth - month) / (1000 * 60 * 60 * 24));
}

/**
 * Timeframe mappings for frontend options
 */
const TIMEFRAME_MAPPINGS = {
  last_month: 30,
  last_3_months: 90,
  last_6_months: 180,
  last_year: 365,
  current_month: getCurrentMonthDays(),
  current_year: getCurrentYearDays(),
  overall: 1095,
  january: getSpecificMonthDays(0),
  february: getSpecificMonthDays(1),
  march: getSpecificMonthDays(2),
  april: getSpecificMonthDays(3),
  may: getSpecificMonthDays(4),
  june: getSpecificMonthDays(5),
  july: getSpecificMonthDays(6),
  august: getSpecificMonthDays(7),
  september: getSpecificMonthDays(8),
  october: getSpecificMonthDays(9),
  november: getSpecificMonthDays(10),
  december: getSpecificMonthDays(11),
};

/**
 * Helper functions for current period calculations
 */
function getCurrentMonthDays() {
  const now = new Date();
  return now.getDate();
}

function getCurrentYearDays() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil((now - start) / (1000 * 60 * 60 * 24));
}

/**
 * Parse timeframe from frontend
 */
const parseTimeframe = (timeframeInput) => {
  // If no timeframe provided, default to 30 days
  if (!timeframeInput) {
    return { days: 30, specificMonth: null, specificYear: null };
  }

  // If it's already a number, return it
  if (typeof timeframeInput === "number") {
    return { days: timeframeInput, specificMonth: null, specificYear: null };
  }

  // Handle string inputs
  if (typeof timeframeInput === "string") {
    const lowerTimeframe = timeframeInput.toLowerCase();

    // Check if it's a predefined mapping
    if (TIMEFRAME_MAPPINGS[lowerTimeframe]) {
      return {
        days: TIMEFRAME_MAPPINGS[lowerTimeframe],
        specificMonth: null,
        specificYear: null,
      };
    }

    // Handle specific month with year (e.g., "january_2024")
    const monthYearMatch = lowerTimeframe.match(/^(\w+)_(\d{4})$/);
    if (monthYearMatch) {
      const [, monthName, year] = monthYearMatch;
      const monthIndex = [
        "january",
        "february",
        "march",
        "april",
        "may",
        "june",
        "july",
        "august",
        "september",
        "october",
        "november",
        "december",
      ].indexOf(monthName);

      if (monthIndex !== -1) {
        return {
          days: getSpecificMonthDays(monthIndex, parseInt(year)),
          specificMonth: monthIndex,
          specificYear: parseInt(year),
        };
      }
    }

    // Handle standalone month names (use current year)
    const monthIndex = [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ].indexOf(lowerTimeframe);

    if (monthIndex !== -1) {
      const currentYear = new Date().getFullYear();
      return {
        days: getSpecificMonthDays(monthIndex, currentYear),
        specificMonth: monthIndex,
        specificYear: currentYear,
      };
    }
  }

  // Default fallback
  return { days: 30, specificMonth: null, specificYear: null };
};

/**
 * GitHub API helper function
 */
const makeGitHubRequest = async (url, accessToken, params = {}) => {
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
      params: {
        per_page: 100,
        ...params,
      },
    });
    return response.data;
  } catch (error) {
    console.error(`GitHub API Error for ${url}:`, error.message);
    throw error;
  }
};

/**
 * Get all paginated results from GitHub API
 */
const getAllPaginatedResults = async (baseUrl, accessToken, params = {}) => {
  let allResults = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      const response = await axios.get(baseUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
        },
        params: {
          per_page: 100,
          page,
          ...params,
        },
      });

      allResults = allResults.concat(response.data);
      hasMore = response.data.length === 100;
      page++;
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error.message);
      break;
    }
  }

  return allResults;
};

/**
 * Filter data by date range with support for specific months
 */
const filterByDateRange = (
  items,
  dateField,
  timeframeDays,
  specificMonth = null,
  specificYear = null
) => {
  if (specificMonth !== null) {
    // Use current year if specificYear is not provided
    const year = specificYear || new Date().getFullYear();
    return items.filter((item) => {
      const itemDate = new Date(item[dateField]);
      return (
        itemDate.getMonth() === specificMonth && itemDate.getFullYear() === year
      );
    });
  }

  // Default behavior - filter by days from current date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - timeframeDays);
  return items.filter((item) => {
    const itemDate = new Date(item[dateField]);
    return itemDate >= cutoffDate;
  });
};

/**
 * Calculate contribution metrics
 */
const calculateContributionMetrics = async (
  repoName,
  username,
  accessToken,
  timeframeDays,
  specificMonth = null,
  specificYear = null
) => {
  const [owner, repo] = repoName.split("/");

  // Get commits
  const commits = await getAllPaginatedResults(
    `https://api.github.com/repos/${repoName}/commits`,
    accessToken,
    { author: username }
  );

  const recentCommits = filterByDateRange(
    commits,
    "commit.author.date",
    timeframeDays,
    specificMonth,
    specificYear
  );

  // Get PRs
  const allPRs = await getAllPaginatedResults(
    `https://api.github.com/repos/${repoName}/pulls`,
    accessToken,
    { creator: username, state: "all" }
  );

  const recentPRs = filterByDateRange(
    allPRs,
    "created_at",
    timeframeDays,
    specificMonth,
    specificYear
  );

  // Calculate commits per week
  const activeWeeks = Math.max(1, Math.ceil(timeframeDays / 7));
  const commits_per_week = recentCommits.length / activeWeeks;

  // Calculate files touched
  let filesTouched = new Set();
  for (const commit of recentCommits) {
    try {
      const commitDetail = await makeGitHubRequest(
        `https://api.github.com/repos/${repoName}/commits/${commit.sha}`,
        accessToken
      );
      commitDetail.files?.forEach((file) => filesTouched.add(file.filename));
    } catch (error) {
      console.error(
        `Error fetching commit details for ${commit.sha}:`,
        error.message
      );
    }
  }

  // Calculate feature PRs
  const featurePRs = recentPRs.filter((pr) => {
    const title = pr.title.toLowerCase();
    const body = (pr.body || "").toLowerCase();
    const labels = pr.labels.map((label) => label.name.toLowerCase());

    return (
      title.includes("feature") ||
      title.includes("enhancement") ||
      title.includes("feat") ||
      body.includes("feature") ||
      labels.some(
        (label) =>
          label.includes("feature") ||
          label.includes("enhancement") ||
          label.includes("feat")
      )
    );
  });

  // Calculate code ownership ratio (simplified approach)
  let totalLinesAuthored = 0;
  let totalLinesInFiles = 0;

  for (const commit of recentCommits.slice(0, 50)) {
    // Limit to avoid rate limiting
    try {
      const commitDetail = await makeGitHubRequest(
        `https://api.github.com/repos/${repoName}/commits/${commit.sha}`,
        accessToken
      );

      if (commitDetail.stats) {
        totalLinesAuthored += commitDetail.stats.additions;
        totalLinesInFiles +=
          commitDetail.stats.additions + commitDetail.stats.deletions;
      }
    } catch (error) {
      console.error(
        `Error calculating ownership for commit ${commit.sha}:`,
        error.message
      );
    }
  }

  const code_ownership_ratio =
    totalLinesInFiles > 0 ? (totalLinesAuthored / totalLinesInFiles) * 100 : 0;

  return {
    commits_per_week: Math.round(commits_per_week * 100) / 100,
    files_touched: filesTouched.size,
    feature_prs: featurePRs.length,
    code_ownership_ratio: Math.round(code_ownership_ratio * 100) / 100,
  };
};

/**
 * Get repository creation date
 */
const getRepoCreationDate = async (repoName, accessToken) => {
  try {
    const repoData = await makeGitHubRequest(
      `https://api.github.com/repos/${repoName}`,
      accessToken
    );
    return repoData.created_at;
  } catch (error) {
    console.error("Error fetching repository creation date:", error.message);
    return null;
  }
};

/**
 * Calculate collaboration metrics
 */
const calculateCollaborationMetrics = async (
  repoName,
  username,
  accessToken,
  timeframeDays,
  specificMonth = null,
  specificYear = null
) => {
  // Get all PRs in the repo
  const allPRs = await getAllPaginatedResults(
    `https://api.github.com/repos/${repoName}/pulls`,
    accessToken,
    { state: "all" }
  );

  const recentPRs = filterByDateRange(
    allPRs,
    "created_at",
    timeframeDays,
    specificMonth,
    specificYear
  );
  const userPRs = recentPRs.filter((pr) => pr.user.login === username);

  let reviewCommentsGiven = 0;
  let reviewCommentsReceived = 0;
  let totalResponseTime = 0;
  let responseCount = 0;

  // Analyze review comments
  for (const pr of recentPRs) {
    try {
      const reviews = await makeGitHubRequest(
        `https://api.github.com/repos/${repoName}/pulls/${pr.number}/reviews`,
        accessToken
      );

      const comments = await makeGitHubRequest(
        `https://api.github.com/repos/${repoName}/pulls/${pr.number}/comments`,
        accessToken
      );

      // Count comments given by user
      const userReviews = reviews.filter(
        (review) => review.user.login === username
      );
      const userComments = comments.filter(
        (comment) => comment.user.login === username
      );
      reviewCommentsGiven += userReviews.length + userComments.length;

      // Count comments received by user (on user's PRs)
      if (pr.user.login === username) {
        const otherReviews = reviews.filter(
          (review) => review.user.login !== username
        );
        const otherComments = comments.filter(
          (comment) => comment.user.login !== username
        );
        reviewCommentsReceived += otherReviews.length + otherComments.length;

        // Calculate response time
        for (const comment of otherComments) {
          const commentTime = new Date(comment.created_at);
          const userResponses = comments.filter(
            (c) =>
              c.user.login === username && new Date(c.created_at) > commentTime
          );

          if (userResponses.length > 0) {
            const firstResponse = userResponses.sort(
              (a, b) => new Date(a.created_at) - new Date(b.created_at)
            )[0];
            const responseTime =
              (new Date(firstResponse.created_at) - commentTime) /
              (1000 * 60 * 60);
            totalResponseTime += responseTime;
            responseCount++;
          }
        }
      }
    } catch (error) {
      console.error(`Error analyzing PR ${pr.number}:`, error.message);
    }
  }

  // Calculate participation rate
  const userReviewedPRs = new Set();
  for (const pr of recentPRs) {
    if (pr.user.login !== username) {
      try {
        const reviews = await makeGitHubRequest(
          `https://api.github.com/repos/${repoName}/pulls/${pr.number}/reviews`,
          accessToken
        );

        if (reviews.some((review) => review.user.login === username)) {
          userReviewedPRs.add(pr.number);
        }
      } catch (error) {
        console.error(
          `Error checking reviews for PR ${pr.number}:`,
          error.message
        );
      }
    }
  }

  const otherPRs = recentPRs.filter((pr) => pr.user.login !== username);
  const review_participation_rate =
    otherPRs.length > 0 ? (userReviewedPRs.size / otherPRs.length) * 100 : 0;

  const avg_response_time_to_reviews =
    responseCount > 0 ? totalResponseTime / responseCount : 0;

  return {
    review_comments_given: reviewCommentsGiven,
    review_comments_received:
      Math.round((reviewCommentsReceived / Math.max(1, userPRs.length)) * 100) /
      100,
    review_participation_rate:
      Math.round(review_participation_rate * 100) / 100,
    avg_response_time_to_reviews:
      Math.round(avg_response_time_to_reviews * 100) / 100,
  };
};

/**
 * Calculate delivery metrics
 */
const calculateDeliveryMetrics = async (
  repoName,
  username,
  accessToken,
  timeframeDays,
  specificMonth = null,
  specificYear = null
) => {
  const userPRs = await getAllPaginatedResults(
    `https://api.github.com/repos/${repoName}/pulls`,
    accessToken,
    { creator: username, state: "all" }
  );

  const recentPRs = filterByDateRange(
    userPRs,
    "created_at",
    timeframeDays,
    specificMonth,
    specificYear
  );
  const mergedPRs = recentPRs.filter((pr) => pr.merged_at);

  // Calculate lead time for changes
  let totalLeadTime = 0;
  let prSizes = [];

  for (const pr of mergedPRs) {
    const createdAt = new Date(pr.created_at);
    const mergedAt = new Date(pr.merged_at);
    const leadTime = (mergedAt - createdAt) / (1000 * 60 * 60); // hours
    totalLeadTime += leadTime;

    // Get PR size
    try {
      const prDetail = await makeGitHubRequest(
        `https://api.github.com/repos/${repoName}/pulls/${pr.number}`,
        accessToken
      );
      prSizes.push(prDetail.additions + prDetail.deletions);
    } catch (error) {
      console.error(`Error fetching PR ${pr.number} details:`, error.message);
    }
  }

  const lead_time_for_changes =
    mergedPRs.length > 0 ? totalLeadTime / mergedPRs.length : 0;

  // Calculate PR size variance
  const avgPRSize =
    prSizes.length > 0
      ? prSizes.reduce((sum, size) => sum + size, 0) / prSizes.length
      : 0;
  const variance =
    prSizes.length > 1
      ? prSizes.reduce((sum, size) => sum + Math.pow(size - avgPRSize, 2), 0) /
        (prSizes.length - 1)
      : 0;
  const pr_size_variance = Math.sqrt(variance);

  // Calculate merge frequency
  const activeWeeks = Math.max(1, Math.ceil(timeframeDays / 7));
  const merge_frequency = mergedPRs.length / activeWeeks;

  // Calculate issue closure rate
  const issues = await getAllPaginatedResults(
    `https://api.github.com/repos/${repoName}/issues`,
    accessToken,
    { assignee: username, state: "all" }
  );

  const recentIssues = filterByDateRange(
    issues,
    "created_at",
    timeframeDays,
    specificMonth,
    specificYear
  );
  const closedIssues = recentIssues.filter((issue) => issue.state === "closed");
  const issue_closure_rate =
    recentIssues.length > 0
      ? (closedIssues.length / recentIssues.length) * 100
      : 0;

  return {
    lead_time_for_changes: Math.round(lead_time_for_changes * 100) / 100,
    pr_size_variance: Math.round(pr_size_variance * 100) / 100,
    merge_frequency: Math.round(merge_frequency * 100) / 100,
    issue_closure_rate: Math.round(issue_closure_rate * 100) / 100,
  };
};

/**
 * Calculate code quality metrics
 */
const calculateCodeQualityMetrics = async (
  repoName,
  username,
  accessToken,
  timeframeDays,
  specificMonth = null,
  specificYear = null
) => {
  const userPRs = await getAllPaginatedResults(
    `https://api.github.com/repos/${repoName}/pulls`,
    accessToken,
    { creator: username, state: "all" }
  );

  const recentPRs = filterByDateRange(
    userPRs,
    "created_at",
    timeframeDays,
    specificMonth,
    specificYear
  );

  // Calculate churn rate (simplified - files modified within 21 days)
  const commits = await getAllPaginatedResults(
    `https://api.github.com/repos/${repoName}/commits`,
    accessToken,
    { author: username }
  );

  const recentCommits = filterByDateRange(
    commits,
    "commit.author.date",
    timeframeDays,
    specificMonth,
    specificYear
  );

  let totalLinesCommitted = 0;
  let churnedLines = 0;

  for (const commit of recentCommits.slice(0, 30)) {
    // Limit to avoid rate limiting
    try {
      const commitDetail = await makeGitHubRequest(
        `https://api.github.com/repos/${repoName}/commits/${commit.sha}`,
        accessToken
      );

      if (commitDetail.stats) {
        totalLinesCommitted += commitDetail.stats.additions;

        // Check for churn (files modified within 21 days)
        const commitDate = new Date(commit.commit.author.date);
        const churnCutoff = new Date(
          commitDate.getTime() + 21 * 24 * 60 * 60 * 1000
        );

        for (const file of commitDetail.files || []) {
          const laterCommits = await makeGitHubRequest(
            `https://api.github.com/repos/${repoName}/commits`,
            accessToken,
            {
              path: file.filename,
              since: commitDate.toISOString(),
              until: churnCutoff.toISOString(),
              author: username,
            }
          );

          if (laterCommits.length > 1) {
            churnedLines += file.additions || 0;
          }
        }
      }
    } catch (error) {
      console.error(
        `Error calculating churn for commit ${commit.sha}:`,
        error.message
      );
    }
  }

  const churn_rate =
    totalLinesCommitted > 0 ? (churnedLines / totalLinesCommitted) * 100 : 0;

  // Calculate reopen rate
  let reopenedPRs = 0;
  for (const pr of recentPRs) {
    try {
      const timeline = await makeGitHubRequest(
        `https://api.github.com/repos/${repoName}/issues/${pr.number}/timeline`,
        accessToken
      );

      const reopenEvents = timeline.filter(
        (event) => event.event === "reopened"
      );
      if (reopenEvents.length > 0) {
        reopenedPRs++;
      }
    } catch (error) {
      console.error(
        `Error checking timeline for PR ${pr.number}:`,
        error.message
      );
    }
  }

  const reopen_rate =
    recentPRs.length > 0 ? (reopenedPRs / recentPRs.length) * 100 : 0;

  // Calculate failed PR ratio
  const closedPRs = recentPRs.filter(
    (pr) => pr.state === "closed" && !pr.merged_at
  );
  const failed_pr_ratio =
    recentPRs.length > 0 ? (closedPRs.length / recentPRs.length) * 100 : 0;

  return {
    churn_rate: Math.round(churn_rate * 100) / 100,
    reopen_rate: Math.round(reopen_rate * 100) / 100,
    failed_pr_ratio: Math.round(failed_pr_ratio * 100) / 100,
  };
};

/**
 * Calculate all developer metrics using real GitHub data
 */
const calculateDeveloperMetrics = async (
  repoName,
  username,
  accessToken,
  timeframeDays,
  specificMonth = null,
  specificYear = null
) => {
  try {
    console.log(
      `Calculating metrics for ${username} in ${repoName} over ${timeframeDays} days` +
        (specificMonth !== null
          ? ` for month ${specificMonth + 1}${
              specificYear ? `, year ${specificYear}` : ""
            }`
          : "")
    );

    // Calculate all metric categories in parallel
    const [
      contributionMetrics,
      collaborationMetrics,
      deliveryMetrics,
      codeQualityMetrics,
    ] = await Promise.all([
      calculateContributionMetrics(
        repoName,
        username,
        accessToken,
        timeframeDays,
        specificMonth,
        specificYear
      ),
      calculateCollaborationMetrics(
        repoName,
        username,
        accessToken,
        timeframeDays,
        specificMonth,
        specificYear
      ),
      calculateDeliveryMetrics(
        repoName,
        username,
        accessToken,
        timeframeDays,
        specificMonth,
        specificYear
      ),
      calculateCodeQualityMetrics(
        repoName,
        username,
        accessToken,
        timeframeDays,
        specificMonth,
        specificYear
      ),
    ]);

    return {
      ...contributionMetrics,
      ...collaborationMetrics,
      ...deliveryMetrics,
      ...codeQualityMetrics,
    };
  } catch (error) {
    console.error("Error calculating developer metrics:", error.message);
    throw new AppError(
      "Failed to calculate developer metrics from GitHub data",
      500
    );
  }
};

/**
 * Scoring functions for different rules
 */
const scoringFunctions = {
  linear: (value, min, max) => {
    if (value <= min) return 0;
    if (value >= max) return 100;
    return ((value - min) / (max - min)) * 100;
  },

  inverse: (value, min, max) => {
    if (value <= min) return 100;
    if (value >= max) return 0;
    return 100 - ((value - min) / (max - min)) * 100;
  },

  "inverse-linear": (value, min, max) => {
    if (value <= min) return 100;
    if (value >= max) return 0;
    return 100 - ((value - min) / (max - min)) * 100;
  },

  "inverse-log": (value, min, max) => {
    if (value <= min) return 100;
    if (value >= max) return 0;
    const logValue = Math.log(value - min + 1);
    const logMax = Math.log(max - min + 1);
    return 100 - (logValue / logMax) * 100;
  },

  log: (value, min, max) => {
    if (value <= min) return 0;
    if (value >= max) return 100;
    const logValue = Math.log(value - min + 1);
    const logMax = Math.log(max - min + 1);
    return (logValue / logMax) * 100;
  },

  bell: (value, min, max) => {
    const mid = (min + max) / 2;
    const range = max - min;
    if (value < min || value > max) return 0;

    const distance = Math.abs(value - mid);
    const maxDistance = range / 2;
    return 100 * (1 - Math.pow(distance / maxDistance, 2));
  },
};

/**
 * Calculate metric score based on scoring rule
 */
const calculateMetricScore = (value, expectedRange, scoringRule) => {
  if (value === null || value === undefined) return null;

  const [min, max] = expectedRange;
  const scoringFunction = scoringFunctions[scoringRule];

  if (!scoringFunction) {
    throw new Error(`Unknown scoring rule: ${scoringRule}`);
  }

  return Math.max(0, Math.min(100, scoringFunction(value, min, max)));
};

/**
 * Calculate category score from metrics
 */
const calculateCategoryScore = (metrics, categoryConfig) => {
  let totalWeight = 0;
  let weightedScore = 0;
  let availableMetrics = 0;

  for (const [metricName, metricConfig] of Object.entries(
    categoryConfig.metrics
  )) {
    const metricValue = metrics[metricName];

    if (metricValue !== null && metricValue !== undefined) {
      const score = calculateMetricScore(
        metricValue,
        metricConfig.expected_range,
        metricConfig.scoring_rule
      );

      if (score !== null) {
        weightedScore += score * metricConfig.weight;
        totalWeight += metricConfig.weight;
        availableMetrics++;
      }
    }
  }

  if (totalWeight === 0 || availableMetrics === 0) return null;

  return weightedScore / totalWeight;
};

/**
 * Assign letter grade based on score
 */
const assignGrade = (score) => {
  for (const [grade, range] of Object.entries(
    SCORING_CONFIG.performance_bands
  )) {
    if (score >= range.min && score <= range.max) {
      return grade;
    }
  }
  return "F";
};

/**
 * Calculate Developer Impact Score - Main Function
 */
const calculateDeveloperImpactScore = async (req, res, next) => {
  try {
    const { repoName, username, timeframe } = req.body;
    const accessToken = req.session.accessToken;

    if (!accessToken) {
      return next(new AppError("Authentication required", 401));
    }

    if (!repoName || !username) {
      return next(
        new AppError("Repository name and username are required", 400)
      );
    }

    // Validate repository format
    if (!repoName.includes("/")) {
      return next(
        new AppError("Repository name must be in format 'owner/repo'", 400)
      );
    }

    // Parse timeframe to days and check for specific month
    const {
      days: timeframeDays,
      specificMonth,
      specificYear,
    } = parseTimeframe(timeframe);

    // Verify repository exists and get creation date
    let repoCreatedAt;
    try {
      const repoData = await makeGitHubRequest(
        `https://api.github.com/repos/${repoName}`,
        accessToken
      );
      repoCreatedAt = repoData.created_at;
    } catch (error) {
      if (error.response?.status === 404) {
        return next(new AppError("Repository not found", 404));
      }
      throw error;
    }

    // Calculate metrics from GitHub data based on timeframe
    const metrics = await calculateDeveloperMetrics(
      repoName,
      username,
      accessToken,
      timeframeDays,
      specificMonth,
      specificYear
    );

    // Calculate category scores
    const categoryScores = {};
    let totalWeightedScore = 0;
    let availableCategories = 0;

    for (const [categoryName, categoryConfig] of Object.entries(
      SCORING_CONFIG.categories
    )) {
      const categoryScore = calculateCategoryScore(metrics, categoryConfig);

      if (categoryScore !== null) {
        categoryScores[categoryName] = Math.round(categoryScore * 100) / 100;
        totalWeightedScore += categoryScore * (categoryConfig.weight / 100);
        availableCategories++;
      } else {
        categoryScores[categoryName] = null;
      }
    }

    // Calculate final DIS score
    if (availableCategories < 3) {
      return next(
        new AppError(
          "Insufficient data - need at least 3 categories with data",
          400
        )
      );
    }

    const finalScore = Math.round(totalWeightedScore * 100) / 100;

    // Assign grade
    const grade = assignGrade(finalScore);

    // Check for edge cases
    const flags = [];
    const totalActivity =
      (metrics.commits_per_week || 0) * 4 + (metrics.feature_prs || 0);
    if (totalActivity < 8) {
      flags.push("low_activity");
    }

    if (availableCategories < Object.keys(SCORING_CONFIG.categories).length) {
      flags.push("incomplete_data");
    }

    const result = {
      developer: username,
      repository: repoName,
      repository_created_at: repoCreatedAt, // Add repository creation date
      timeframe: timeframe,
      score: {
        total: finalScore,
        grade: grade,
        categories: categoryScores,
      },
      flags: flags,
    };

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error calculating Developer Impact Score:", error.message);
    if (error.response?.status === 404) {
      return next(new AppError("Repository not found", 404));
    }
    if (error.response?.status === 403) {
      return next(
        new AppError("Access forbidden - check repository permissions", 403)
      );
    }
    next(new AppError("Failed to calculate Developer Impact Score", 500));
  }
};

module.exports = {
  calculateDeveloperImpactScore,
};
