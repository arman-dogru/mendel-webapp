const axios = require("axios");
const { AppError } = require("../utils/errorHandler");

const getRepoBranches = async (req, res, next) => {
  const { owner, repo } = req.params;
  const accessToken = req.session.accessToken;

  if (!accessToken) {
    return next(new AppError("Access token not found", 401));
  }

  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/branches`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    const branches = response.data.map((branch) => ({
      name: branch.name,
      commit: branch.commit.sha,
    }));

    res.json(branches);
  } catch (error) {
    console.error("Error fetching branches:", error.message);
    next(new AppError("Failed to fetch branches", 500));
  }
};

const getRepoCommits = async (req, res, next) => {
  const { owner, repo } = req.params;
  const { branch } = req.query;
  const accessToken = req.session.accessToken;

  if (!accessToken) {
    return next(new AppError("Access token not found", 401));
  }

  if (!branch) {
    return next(new AppError("Branch name is required", 400));
  }

  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/commits?sha=${branch}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
        },
      }
    );
    const commits = response.data.map((commit) => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author.name,
      date: commit.commit.author.date,
      branch: branch,
      parents: commit.parents.map((parent) => parent.sha),
    }));

    res.json(commits);
  } catch (error) {
    console.error("Error fetching commits:", error.message);
    next(new AppError("Failed to fetch commits", 500));
  }
};

const getRepoMerges = async (req, res, next) => {
  const { owner, repo } = req.params;
  const accessToken = req.session.accessToken;

  if (!accessToken) {
    return next(new AppError("Access token not found", 401));
  }

  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/pulls?state=closed`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    const merges = response.data
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
    console.error("Error fetching merges:", error.message);
    next(new AppError("Failed to fetch merges", 500));
  }
};

const getRepoIssues = async (req, res, next) => {
  const { owner, repo } = req.params;
  const { state = "open" } = req.query;
  const accessToken = req.session.accessToken;

  if (!accessToken) {
    return next(new AppError("Access token not found", 401));
  }

  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/issues?state=${state}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    const issues = response.data
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
    console.error("Error fetching issues: ", error.message);
    next(new AppError("Failed to fetch issues", 500));
  }
};

module.exports = {
  getRepoBranches,
  getRepoCommits,
  getRepoMerges,
  getRepoIssues,
};
