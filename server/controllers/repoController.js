const axios = require("axios");
const { decryptData } = require("../utils/crypto");
const { AppError } = require("../utils/errorHandler");

const githubApiRequest = async (url, accessToken, params = {}) => {
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
      params,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const { status, data } = error.response;
      if (status === 403 || status === 429) {
        throw new AppError("API rate limit exceeded", 429);
      }
      if (status === 404) {
        throw new AppError("Resource not found", 404);
      }
      throw new AppError(
        `GitHub API error: ${data.message || "Unknown error"}`,
        status
      );
    }
    throw new AppError("Failed to reach GitHub API", 503);
  }
};

const getRepoBranches = async (req, res, next) => {
  const { owner, repo } = req.params;
  const { accessToken } = req;

  try {
    const data = await githubApiRequest(
      `https://api.github.com/repos/${owner}/${repo}/branches`,
      accessToken
    );
    const branches = data.map((branch) => ({
      name: branch.name,
      commit: branch.commit.sha,
    }));

    res.json(branches);
  } catch (error) {
    next(error);
  }
};

const getRepoCommits = async (req, res, next) => {
  const { owner, repo } = req.params;
  const { branch } = req.query;
  const { accessToken } = req;

  if (!branch) {
    return next(new AppError("Branch name is required", 400));
  }

  try {
    const data = await githubApiRequest(
      `https://api.github.com/repos/${owner}/${repo}/commits?sha=${branch}`,
      accessToken
    );
    const commits = data.map((commit) => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author.name,
      date: commit.commit.author.date,
      branch: branch,
      parents: commit.parents.map((parent) => parent.sha),
    }));

    res.json(commits);
  } catch (error) {
    next(error);
  }
};

const getRepoMerges = async (req, res, next) => {
  const { owner, repo } = req.params;
  const { accessToken } = req;

  try {
    const data = await githubApiRequest(
      `https://api.github.com/repos/${owner}/${repo}/pulls?state=closed`,
      accessToken
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
    next(error);
  }
};

const getRepoIssues = async (req, res, next) => {
  const { owner, repo } = req.params;
  const { state = "open" } = req.query;
  const { accessToken } = req;

  try {
    const data = await githubApiRequest(
      `https://api.github.com/repos/${owner}/${repo}/issues?state=${state}`,
      accessToken
    );
    const issues = data
      .filter((issue) => !issue.pull_request)
      .map((issue) => ({
        id: issue.number,
        title: issue.title,
        createdAt: issue.created_at,
        author: issue.user.login,
        status: issue.state,
        labels: issue.labels.map((label) => label.name),
        comments: issue.comments,
        url: issue.html_url,
      }));

    res.json(issues);
  } catch (error) {
    next(error);
  }
};

const getRepoPR = async (req, res, next) => {
  const { owner, repo } = req.params;
  const { accessToken } = req;
  const encryptedUsername = req.session.encryptedUsername;
  const currentUser = encryptedUsername ? decryptData(encryptedUsername) : null;
  const { branch } = req.query;

  if (!currentUser) {
    return next(new AppError("User not authenticated", 401));
  }

  try {
    const data = await githubApiRequest(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      accessToken,
      { state: "all", per_page: 100, base: branch || "master" }
    );

    const commentFetchPromises = data.map((pr) =>
      githubApiRequest(
        `https://api.github.com/repos/${owner}/${repo}/issues/${pr.number}/comments`,
        accessToken
      )
    );

    const allCommentsData = await Promise.all(commentFetchPromises);
    const prs = data.map((pr, index) => {
      const commentsData = allCommentsData[index];

      return {
        id: pr.number,
        title: pr.title,
        createdAt: pr.created_at,
        author: pr.user.login,
        status: pr.state,
        labels: pr.labels.map((label) => label.name),
        comments: commentsData.length,
        mergedAt: pr.merged_at,
        requestedReviewers: pr.requested_reviewers
          ? pr.requested_reviewers.map((reviewer) => reviewer.login)
          : [],
        baseBranch: pr.base.ref,
        headBranch: pr.head.ref,
        url: pr.html_url,
      };
    });

    const categorizedPRs = {
      open: [],
      needsYourReview: [],
      waitingForAuthor: [],
      closed: [],
      merged: [],
    };

    prs.forEach((pr) => {
      if (pr.status === "open") {
        categorizedPRs.open.push(pr);

        if (pr.comments > 0 && pr.author === currentUser) {
          categorizedPRs.waitingForAuthor.push(pr);
        } else {
          categorizedPRs.needsYourReview.push(pr);
        }
      } else if (pr.status === "closed") {
        if (pr.mergedAt) {
          categorizedPRs.merged.push(pr);
        } else {
          categorizedPRs.closed.push(pr);
        }
      }
    });

    res.json(categorizedPRs);
  } catch (error) {
    next(error);
  }
};

const getRepoContributors = async (req, res, next) => {
  const { owner, repo } = req.params;
  const { accessToken } = req;

  try {
    const contributorsData = await githubApiRequest(
      `https://api.github.com/repos/${owner}/${repo}/contributors`,
      accessToken,
      { per_page: 100 }
    );

    const contributors = await Promise.all(
      contributorsData.map(async (contributor) => {
        const prsData = await githubApiRequest(
          `https://api.github.com/search/issues?q=type:pr+repo:${owner}/${repo}+author:${contributor.login}`,
          accessToken
        );

        let email = "";
        try {
          const userData = await githubApiRequest(
            `https://api.github.com/users/${contributor.login}`,
            accessToken
          );
          email = userData.email || `${contributor.login}@github.com`;
        } catch (error) {
          console.error(
            `Failed to fetch email for ${contributor.login}:`,
            error.message
          );
          email = `${contributor.login}@github.com`;
        }

        return {
          name: contributor.login,
          email: email,
          totalPRs: prsData.total_count,
          contributions: contributor.contributions,
          avatarUrl: contributor.avatar_url,
          githubUrl: contributor.html_url,
        };
      })
    );

    res.json(contributors);
  } catch (error) {
    next(error);
  }
};

const formatDateForGrouping = (dateString) => {
  const date = new Date(dateString);
  const month = date.toLocaleString("default", { month: "short" });
  const day = date.getDate();
  return `${month} ${day}`;
};

const groupByWeek = (prsData, branchEvents) => {
  const groupedData = {};
  prsData.forEach((item) => {
    const date = new Date(item.date);
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    const weekKey = formatDateForGrouping(startOfWeek);

    if (!groupedData[weekKey]) {
      groupedData[weekKey] = {
        totalPRsMerged: 0,
        branchesCreated: 0,
        timeToMergeTotal: 0,
        mergeCount: 0,
      };
    }

    groupedData[weekKey].totalPRsMerged += 1;
    groupedData[weekKey].timeToMergeTotal += item.timeToMerge || 0;
    groupedData[weekKey].mergeCount += item.timeToMerge ? 1 : 0;
  });

  branchEvents.forEach((event) => {
    const date = new Date(event.created_at);
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    const weekKey = formatDateForGrouping(startOfWeek);

    if (!groupedData[weekKey]) {
      groupedData[weekKey] = {
        totalPRsMerged: 0,
        branchesCreated: 0,
        timeToMergeTotal: 0,
        mergeCount: 0,
      };
    }

    groupedData[weekKey].branchesCreated += 1;
  });

  return Object.keys(groupedData).map((week) => ({
    date: week,
    totalPRsMerged: groupedData[week].totalPRsMerged,
    branchesCreated: groupedData[week].branchesCreated,
    avgTimeToMerge:
      groupedData[week].mergeCount > 0
        ? parseFloat(
            (
              groupedData[week].timeToMergeTotal / groupedData[week].mergeCount
            ).toFixed(1)
          )
        : 0,
    prCount: groupedData[week].totalPRsMerged,
  }));
};

const getDaysDifference = (date1, date2) => {
  const diffTime = Math.abs(new Date(date2) - new Date(date1));
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const getRepoMetrics = async (req, res, next) => {
  const { owner, repo } = req.params;
  const { accessToken } = req;
  const { timeframe = "3months" } = req.query;

  try {
    const startDate = new Date();
    if (timeframe === "1month") {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (timeframe === "6months") {
      startDate.setMonth(startDate.getMonth() - 6);
    } else {
      startDate.setMonth(startDate.getMonth() - 3);
    }

    const prsData = await githubApiRequest(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      accessToken,
      {
        state: "closed",
        sort: "updated",
        direction: "desc",
        per_page: 100,
      }
    );

    const processedPRs = prsData
      .filter((pr) => pr.merged_at && new Date(pr.merged_at) >= startDate)
      .map((pr) => ({
        date: pr.merged_at,
        timeToMerge: pr.merged_at
          ? getDaysDifference(pr.created_at, pr.merged_at)
          : null,
      }));
    const eventsData = await githubApiRequest(
      `https://api.github.com/repos/${owner}/${repo}/events`,
      accessToken,
      { per_page: 100 }
    );

    const branchEvents = eventsData.filter(
      (event) =>
        event.type === "CreateEvent" &&
        event.payload.ref_type === "branch" &&
        new Date(event.created_at) >= startDate
    );

    // Group data by week
    const weeklyData = groupByWeek(processedPRs, branchEvents);

    // Sort data chronologically
    weeklyData.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate overall statistics
    const totalPRsMerged = processedPRs.length;
    const branchesCreated = branchEvents.length;
    const timeToMergeValues = processedPRs
      .filter((pr) => pr.timeToMerge)
      .map((pr) => pr.timeToMerge);
    const avgTimeToMerge =
      timeToMergeValues.length > 0
        ? parseFloat(
            (
              timeToMergeValues.reduce((sum, val) => sum + val, 0) /
              timeToMergeValues.length
            ).toFixed(1)
          )
        : 0;

    const response = {
      prMergeData: weeklyData,
      timeToMergeData: weeklyData,
      totalStats: {
        totalPRsMerged,
        branchesCreated,
        avgTimeToMerge,
      },
    };

    res.json(response);
  } catch (error) {
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
};
