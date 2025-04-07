const axios = require("axios");
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
  const currentUser = req.session.username;
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

    const prs = await Promise.all(
      data.map(async (pr) => {
        const commentsData = await githubApiRequest(
          `https://api.github.com/repos/${owner}/${repo}/issues/${pr.number}/comments`,
          accessToken
        );

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
      })
    );

    const categorizedPRs = {
      open: [],
      needsYourReview: [],
      waitingForAuthor: [],
      closed: [],
      merged: [],
    };

    prs.forEach((pr) => {
      if (pr.status === "open") {
        if (pr.comments > 0 && pr.author === currentUser) {
          categorizedPRs.waitingForAuthor.push(pr);
        } else {
          categorizedPRs.needsYourReview.push(pr);
        }
      } else if (pr.status === "closed") {
        categorizedPRs.merged.push(pr);
      }
    });

    res.json(categorizedPRs);
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
};
