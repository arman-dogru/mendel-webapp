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
    return response.data.isAuthenticated;
  } catch (error) {
    console.error("Error checking auth status:", error);
    // Assume not authenticated on error
    return false;
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
    const response = await apiClient.get("/api/auth/repos"); // Correct endpoint for user's repos
    return response.data;
  } catch (error) {
    console.error("Error fetching user repos:", error);
    throw error;
  }
};

export const getRepoBranches = async (owner, repo) => {
  try {
    // Ensure owner and repo are correctly passed
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
       params: { branch }, // Send branch as query parameter
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
      // Corrected endpoint based on repoRoutes.js
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
     // Using apiClient and correct endpoint
     const response = await apiClient.post(`/api/scan/${owner}/${repo}`);
     return response.data;
   } catch (error) {
     console.error(`Error starting scan for ${owner}/${repo}:`, error);
     // Keep simpler error handling for now, can enhance later
     throw error;
   }
};

export const getScanHistory = async (owner, repo) => {
    try {
        if (!owner || !repo) {
             throw new Error("Owner and repository name are required to get scan history.");
        }
        console.log(`API Call: Fetching scan history for ${owner}/${repo}`);
        // Using apiClient and correct endpoint
        const response = await apiClient.get(`/api/scan/${owner}/${repo}/history`);
        return response.data;
    } catch (error) {
         console.error(`Error fetching scan history for ${owner}/${repo}:`, error);
         // Keep simpler error handling
         throw error;
    }
};

export const getSpecificScan = async (scanId) => {
    try {
        if (!scanId) {
            throw new Error("Scan ID is required.");
        }
        console.log(`API Call: Fetching specific scan with ID: ${scanId}`);
         // Using apiClient and correct endpoint
        const response = await apiClient.get(`/api/scan/${scanId}`);
        return response.data;
    } catch (error) {
         console.error(`Error fetching scan ${scanId}:`, error);
         // Keep simpler error handling
         throw error;
    }
};