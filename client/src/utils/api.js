// client/src/utils/api.js
import axios from "axios";

// Use VITE_BASE_URL from .env
const API_BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:5001";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// --- Auth API ---
export const checkAuthStatus = async () => {
  try {
    const response = await apiClient.get("/api/auth/check-auth/status");
    return response.data;
  } catch (error) {
    console.error("Error checking auth status:", error);
    return { isAuthenticated: false, hasSetPermissions: false };
  }
};

export const logout = async () => {
  try {
    await apiClient.post("/api/auth/logout");
  } catch (error) {
    console.error("Error logging out:", error);
    throw error;
  }
};

// --- Repo API (Using User Auth Context via Session Cookie) ---

export const getUserRepos = async () => {
  try {
    const response = await apiClient.get("/api/auth/repos");
    return response.data;
  } catch (error) {
    console.error("Error fetching user repos:", error);
    if (error.response?.status === 403 && error.response?.data?.redirectTo) {
      throw { ...error, redirectTo: error.response.data.redirectTo };
    }
    throw error;
  }
};

export const getRepoBranches = async (owner, repo) => {
  try {
    if (!owner || !repo) {
      throw new Error(
        "Owner and repository name are required to fetch branches."
      );
    }
    const response = await apiClient.get(`/api/repo/${owner}/${repo}/branches`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching branches for ${owner}/${repo}:`, error);
    throw error;
  }
};

export const getRepoCommits = async (owner, repo, branch) => {
  try {
    if (!owner || !repo || !branch) {
      throw new Error(
        "Owner, repository, and branch name are required to fetch commits."
      );
    }
    const response = await apiClient.get(`/api/repo/${owner}/${repo}/commits`, {
      params: { branch },
    });
    return response.data;
  } catch (error) {
    console.error(
      `Error fetching commits for ${owner}/${repo}, branch ${branch}:`,
      error
    );
    throw error;
  }
};

export const getRepoMerges = async (owner, repo) => {
  try {
    if (!owner || !repo) {
      throw new Error(
        "Owner and repository name are required to fetch merges."
      );
    }
    const response = await apiClient.get(`/api/repo/${owner}/${repo}/merges`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching merges for ${owner}/${repo}:`, error);
    throw error;
  }
};

export const getRepoIssues = async (owner, repo, state = "open") => {
  try {
    if (!owner || !repo) {
      throw new Error(
        "Owner and repository name are required to fetch issues."
      );
    }

    const response = await apiClient.get(`/api/repo/${owner}/${repo}/issues`, {
      params: { state },
    });
    return response.data;
  } catch (error) {
    console.error(
      `Error fetching issues for ${owner}/${repo}, state: ${state}:`,
      error
    );
    throw error;
  }
};

export const getRepoPRs = async (owner, repo, branch = null) => {
  try {
    if (!owner || !repo) {
      throw new Error("Owner and repository name are required to fetch PRs.");
    }
    const params = {};
    if (branch) {
      params.branch = branch;
    }
    const response = await apiClient.get(
      `/api/repo/${owner}/${repo}/pull-requests`,
      { params }
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching PRs for ${owner}/${repo}:`, error);
    throw error;
  }
};

export const getRepoContributors = async (owner, repo) => {
  try {
    if (!owner || !repo) {
      throw new Error(
        "Owner and repository name are required to fetch contributors."
      );
    }
    const response = await apiClient.get(
      `/api/repo/${owner}/${repo}/contributors`
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching contributors for ${owner}/${repo}:`, error);
    throw error;
  }
};

// --- Scan API ---
export const scanRepository = async (owner, repo) => {
  try {
    if (!owner || !repo) {
      throw new Error("Owner and repository name are required to start scan.");
    }
    const response = await apiClient.post(`/api/scan/${owner}/${repo}`);
    return response.data;
  } catch (error) {
    console.error(`Error starting scan for ${owner}/${repo}:`, error);
    throw error;
  }
};

export const getScanHistory = async (owner, repo) => {
  try {
    if (!owner || !repo) {
      throw new Error(
        "Owner and repository name are required to get scan history."
      );
    }
    const response = await apiClient.get(`/api/scan/${owner}/${repo}/history`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching scan history for ${owner}/${repo}:`, error);
    throw error;
  }
};

export const getSpecificScan = async (scanId) => {
  try {
    if (!scanId) {
      throw new Error("Scan ID is required.");
    }
    const response = await apiClient.get(`/api/scan/${scanId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching scan ${scanId}:`, error);
    throw error;
  }
};

// --- Metrics & Permissions API (Ensure these use apiClient) ---
export const getRepoMetrics = async (owner, repo) => {
  try {
    if (!owner || !repo) {
      throw new Error(
        "Owner and repository name are required to fetch metrics."
      );
    }
    const response = await apiClient.get(`/api/repo/${owner}/${repo}/metrics`);
    return response.data;
  } catch (error) {
    console.error(
      `Error fetching repository metrics for ${owner}/${repo}:`,
      error
    );
    throw error;
  }
};

export const getAllUserRepos = async () => {
  try {
    const response = await apiClient.get("/api/auth/all-repos");
    return response.data;
  } catch (error) {
    console.error("Error fetching all repositories:", error);
    throw error;
  }
};

export const getPRComments = async (owner, repo, prNumber) => {
  try {
    if (!owner || !repo || !prNumber) {
      throw new Error(
        "Owner, repository, and PR number are required to fetch comments."
      );
    }
    const response = await apiClient.get(
      `/api/repo/${owner}/${repo}/pull-requests/${prNumber}/comments`
    );
    return response.data;
  } catch (error) {
    console.error(
      `Error fetching comments for ${owner}/${repo}/pull/${prNumber}:`,
      error
    );
    throw error;
  }
};
