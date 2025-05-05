// client/src/utils/api.js
import axios from "axios";

// Use VITE_BASE_URL from .env
const API_BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:5001";
console.log("API base URL →", API_BASE_URL); // Log the base URL being used

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Send cookies (like session ID) with requests
});

// --- Auth API ---
export const checkAuthStatus = async () => {
  try {
    const response = await apiClient.get("/api/auth/check-auth/status");
    // Return the full data object which now includes isAuthenticated and hasSetPermissions
    return response.data;
  } catch (error) {
    console.error("Error checking auth status:", error);
    // Return a default state indicating not authenticated on error
    return { isAuthenticated: false, hasSetPermissions: false };
  }
};

export const logout = async () => {
  try {
    await apiClient.post("/api/auth/logout");
  } catch (error) {
    console.error("Error logging out:", error);
    throw error; // Re-throw to handle in component
  }
};

// --- Repo API (Using User Auth Context via Session Cookie) ---

export const getUserRepos = async () => {
  try {
    // This endpoint now potentially returns a 403 if permissions aren't set
    const response = await apiClient.get("/api/auth/repos");
    return response.data;
  } catch (error) {
    console.error("Error fetching user repos:", error);
    // Check if the error indicates redirection is needed
    if (error.response?.status === 403 && error.response?.data?.redirectTo) {
       throw { ...error, redirectTo: error.response.data.redirectTo }; // Re-throw with redirection info
    }
    throw error; // Re-throw other errors
  }
};

export const getRepoBranches = async (owner, repo) => {
  try {
    if (!owner || !repo) {
       throw new Error("Owner and repository name are required to fetch branches.");
    }
    console.log(`API Call: Fetching branches for ${owner}/${repo}`);
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
        throw new Error("Owner, repository, and branch name are required to fetch commits.");
     }
     console.log(`API Call: Fetching commits for ${owner}/${repo}, branch ${branch}`);
     const response = await apiClient.get(`/api/repo/${owner}/${repo}/commits`, {
       params: { branch },
     });
     return response.data;
   } catch (error) {
     console.error(`Error fetching commits for ${owner}/${repo}, branch ${branch}:`, error);
     throw error;
   }
};

export const getRepoMerges = async (owner, repo) => {
   try {
      if (!owner || !repo) {
         throw new Error("Owner and repository name are required to fetch merges.");
      }
     console.log(`API Call: Fetching merges for ${owner}/${repo}`);
     const response = await apiClient.get(`/api/repo/${owner}/${repo}/merges`);
     return response.data;
   } catch (error) {
     console.error(`Error fetching merges for ${owner}/${repo}:`, error);
     throw error;
   }
};

export const getRepoIssues = async (owner, repo, state = 'open') => {
  try {
     if (!owner || !repo) {
        throw new Error("Owner and repository name are required to fetch issues.");
     }
    console.log(`API Call: Fetching issues for ${owner}/${repo}, state: ${state}`);
    const response = await apiClient.get(`/api/repo/${owner}/${repo}/issues`, {
      params: { state },
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching issues for ${owner}/${repo}, state: ${state}:`, error);
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
     console.log(`API Call: Fetching PRs for ${owner}/${repo}`, branch ? `base branch: ${branch}` : '');
    const response = await apiClient.get(`/api/repo/${owner}/${repo}/pull-requests`, { params });
    return response.data;
  } catch (error) {
    console.error(`Error fetching PRs for ${owner}/${repo}:`, error);
    throw error;
  }
};

export const getRepoContributors = async (owner, repo) => {
  try {
      if (!owner || !repo) {
         throw new Error("Owner and repository name are required to fetch contributors.");
      }
      console.log(`API Call: Fetching contributors for ${owner}/${repo}`);
      const response = await apiClient.get(`/api/repo/${owner}/${repo}/contributors`);
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
     console.log(`API Call: Starting scan for ${owner}/${repo}`);
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
             throw new Error("Owner and repository name are required to get scan history.");
        }
        console.log(`API Call: Fetching scan history for ${owner}/${repo}`);
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
        console.log(`API Call: Fetching specific scan with ID: ${scanId}`);
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
         throw new Error("Owner and repository name are required to fetch metrics.");
      }
      console.log(`API Call: Fetching metrics for ${owner}/${repo}`);
      // *** FIXED: Use apiClient and correct endpoint ***
      const response = await apiClient.get(
          `/api/repo/${owner}/${repo}/metrics`
      );
    return response.data;
  } catch (error) {
    console.error(`Error fetching repository metrics for ${owner}/${repo}:`, error);
    throw error;
  }
};

export const getAllUserRepos = async () => {
  try {
     console.log(`API Call: Fetching all user repos for permissions`);
     // *** FIXED: Use apiClient ***
    const response = await apiClient.get("/api/auth/all-repos");
    return response.data;
  } catch (error) {
    console.error("Error fetching all repositories:", error);
    throw error;
  }
};

export const saveUserRepoPermissions = async (repositories) => {
  try {
     console.log(`API Call: Saving repo permissions`, repositories);
     // *** FIXED: Use apiClient ***
    const response = await apiClient.post("/api/auth/repo-permissions", {
      repositories, // Send data in the request body
    });
    return response.data;
  } catch (error) {
    console.error("Error saving repository permissions:", error);
    throw error;
  }
};