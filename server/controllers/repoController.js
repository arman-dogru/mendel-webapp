const axios = require("axios");
const { AppError } = require("../utils/errorHandler");

const getRepoCommits = async (req, res, next) => {
  const accessToken = req.session.accessToken;
  const { owner, repo } = req.params;

  if (!accessToken) {
    return next(new AppError("Token not found", 400));
  }

  if (!owner || !repo) {
    return next(new AppError("Owner and repo name are required", 400));
  }

  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/commits`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching commits:", error.message);
    if (error.response) {
      console.error("GitHub error details:", error.response.data);
      if (error.response.status === 404) {
        return res.json([]); // Return empty array if repo or commits not found
      }
    }
    next(new AppError("Failed to fetch commits", 500));
  }
};

const getRepoBranches = async (req, res, next) => {
  const accessToken = req.session.accessToken;
  const { owner, repo } = req.params;

  if (!accessToken) {
    return next(new AppError("Token not found", 400));
  }

  if (!owner || !repo) {
    return next(new AppError("Owner and repo name are required", 400));
  }

  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/branches`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching branches:", error.message);
    if (error.response) {
      console.error("GitHub error details:", error.response.data);
      if (error.response.status === 404) {
        return res.json([]);
      }
    }
    next(new AppError("Failed to fetch branches", 500));
  }
};

const getBranchCommits = async (req, res, next) => {
  const accessToken = req.session.accessToken;
  const { owner, repo, branch } = req.params;
  const { page = 1, per_page = 100 } = req.query;

  if (!accessToken) {
    return next(new AppError("Token not found", 400));
  }

  if (!owner || !repo || !branch) {
    return next(new AppError("Owner, repo name, and branch are required", 400));
  }

  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/commits`,
      {
        params: {
          sha: branch,
          page,
          per_page,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error(
      `Error fetching commits for branch ${branch}:`,
      error.message
    );
    if (error.response) {
      console.error("GitHub error details:", error.response.data);
      if (error.response.status === 404) {
        return res.json([]);
      }
      if (error.response.status === 403) {
        return next(new AppError("GitHub API rate limit exceeded", 403));
      }
    }
    next(new AppError(`Failed to fetch commits for branch ${branch}`, 500));
  }
};

const getRepoPullRequests = async (req, res, next) => {
  const accessToken = req.session.accessToken;
  const { owner, repo } = req.params;

  if (!accessToken) {
    return next(new AppError("Token not found", 400));
  }

  if (!owner || !repo) {
    return next(new AppError("Owner and repo name are required", 400));
  }

  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/pulls?state=closed`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching pull requests:", error.message);
    if (error.response) {
      console.error("GitHub error details:", error.response.data);
      if (error.response.status === 404) {
        return res.json([]);
      }
    }
    next(new AppError("Failed to fetch pull requests", 500));
  }
};

const getGitTree = async (req, res, next) => {
  const accessToken = req.session.accessToken;
  const { owner, repo } = req.params;

  if (!accessToken) {
    return next(new AppError("Token not found", 400));
  }

  if (!owner || !repo) {
    return next(new AppError("Owner and repo name are required", 400));
  }

  try {
    // Fetch branches
    const branchesResponse = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/branches`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );
    const branchesData = branchesResponse.data;

    // Transform branches (without colors, as they will be handled on the frontend)
    const branches = branchesData.map((branch) => ({
      name: branch.name,
    }));

    // Map commits to their branches
    const commitToBranches = new Map();
    for (const branch of branchesData) {
      let page = 1;
      let moreCommits = true;
      while (moreCommits) {
        const commitsResponse = await axios.get(
          `https://api.github.com/repos/${owner}/${repo}/commits`,
          {
            params: { sha: branch.name, page, per_page: 100 },
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
            },
          }
        );
        const branchCommits = commitsResponse.data;
        if (branchCommits.length === 0) {
          moreCommits = false;
        } else {
          branchCommits.forEach((commit) => {
            if (!commitToBranches.has(commit.sha)) {
              commitToBranches.set(commit.sha, new Set());
            }
            commitToBranches.get(commit.sha).add(branch.name);
          });
          page++;
        }
      }
    }

    const allCommits = new Map();
    let commitCounter = 1;
    for (const branch of branchesData) {
      let page = 1;
      let moreCommits = true;
      while (moreCommits) {
        const commitsResponse = await axios.get(
          `https://api.github.com/repos/${owner}/${repo}/commits`,
          {
            params: { sha: branch.name, page, per_page: 100 },
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
            },
          }
        );
        const commits = commitsResponse.data;
        if (commits.length === 0) {
          moreCommits = false;
        } else {
          commits.forEach((commit) => {
            if (!allCommits.has(commit.sha)) {
              allCommits.set(commit.sha, {
                id: `c${commitCounter++}`,
                hash: commit.sha.substring(0, 7),
                branch: branch.name,
                message: commit.commit.message,
                timestamp: commit.commit.author.date,
                author: commit.commit.author.name,
                isMerge: commit.parents.length > 1,
                parent: commit.parents[0]?.sha || null,
                mergeParent: commit.parents[1]?.sha || null,
                pr: commit.commit.message.includes("Merge pull request")
                  ? `PR#${
                      commit.commit.message.match(/#(\d+)/)?.[1] || "Unknown"
                    }`
                  : null,
              });
            }
          });
          page++;
        }
      }
    }

    const commitsArray = Array.from(allCommits.values());

    commitsArray.forEach((commit) => {
      const associatedBranches = commitToBranches.get(commit.id) || new Set();
      commit.branch = Array.from(associatedBranches).reduce(
        (earliest, branchName) => {
          const branchIndex = branches.findIndex((b) => b.name === branchName);
          const earliestIndex = branches.findIndex((b) => b.name === earliest);
          return branchIndex < earliestIndex ? branchName : earliest;
        },
        commit.branch
      );
    });

    const shaToIdMap = new Map(
      commitsArray.map((commit) => [commit.id, commit.id])
    );
    commitsArray.forEach((commit) => {
      if (commit.parent) {
        const parentCommit = commitsArray.find((c) => c.id === commit.parent);
        commit.parent = parentCommit ? parentCommit.id : null;
      }
      if (commit.mergeParent) {
        const mergeParentCommit = commitsArray.find(
          (c) => c.id === commit.mergeParent
        );
        commit.mergeParent = mergeParentCommit ? mergeParentCommit.id : null;
      }
    });

    res.json({
      branches,
      commits: commitsArray,
    });
  } catch (error) {
    console.error("Error fetching git tree data:", error.message);
    if (error.response) {
      console.error("GitHub error details:", error.response.data);
      if (error.response.status === 404) {
        return res.json({ branches: [], commits: [] });
      }
      if (error.response.status === 403) {
        return next(new AppError("GitHub API rate limit exceeded", 403));
      }
    }
    next(new AppError("Failed to fetch git tree data", 500));
  }
};

module.exports = {
  getRepoCommits,
  getRepoBranches,
  getBranchCommits,
  getRepoPullRequests,
  getGitTree,
};
