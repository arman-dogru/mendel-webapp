import axios from "axios";
const VITE_BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:5000";
import sampleData from "../data/gittree.json";

const axiosInstance = axios.create({
  baseURL: VITE_BASE_URL,
  withCredentials: true,
});

export const getUserRepos = async () => {
  try {
    const response = await axiosInstance.get("/api/auth/repos");
    return response.data;
  } catch (error) {
    console.error("Error fetching repositories:", error);
    throw error;
  }
};

export const checkAuthStatus = async () => {
  try {
    const response = await axiosInstance.get("/api/auth/check-auth/status");
    return response.data.isAuthenticated;
  } catch (error) {
    console.error("Error checking auth status:", error);
    return false;
  }
};

export const logout = async () => {
  try {
    const response = await axiosInstance.post("/api/auth/logout");
    return response.data;
  } catch (error) {
    console.error("Error logging out:", error);
    throw error;
  }
};

export const getRepoBranches = async (owner, repo) => {
  try {
    const response = await axiosInstance.get(
      `/api/repos/${owner}/${repo}/branches`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching branches:", error);
    throw error;
  }
};

export const getRepoCommits = async (owner, repo, branch) => {
  try {
    const response = await axiosInstance.get(
      `/api/repos/${owner}/${repo}/commits?branch=${branch}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching commits:", error);
    throw error;
  }
};

export const getRepoMerges = async (owner, repo) => {
  try {
    const response = await axiosInstance.get(
      `/api/repos/${owner}/${repo}/merges`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching merges:", error);
    throw error;
  }
};

export const getRepoIssues = async (owner, repo, state = "open") => {
  try {
    const response = await axiosInstance.get(
      `/api/repos/${owner}/${repo}/issues?state=${state}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching issues:", error);
    throw error;
  }
};

export const getRepoPRs = async (owner, repo, branch = "master") => {
  try {
    const response = await axiosInstance.get(
      `/api/repos/${owner}/${repo}/pull-requests?branch=${branch}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching PRs", error);
    throw error;
  }
};

export const scanRepository = async (owner, repo) => {
  try {
    const response = await axiosInstance.post(`/api/scan/${owner}/${repo}`);
    return response.data; 
  } catch (error) {
    console.error("Error scanning repository:", error);
    
    if (error.response && error.response.data && error.response.data.message) {
      throw new Error(error.response.data.message);
    }
    throw error;
  }
};

export const getRepoContributors = async (owner, repo) => {
  try {
    const response = await axiosInstance.get(
      `/api/repos/${owner}/${repo}/contributors`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching contributors:", error);
    throw error;
  }
};


/**
 * Fetches a summary list of past scans for a repository.
 * @param {string} owner - The repository owner.
 * @param {string} repo - The repository name.
 * @returns {Promise<Array<object>>} A promise resolving to an array of scan history summaries.
 */
export const getScanHistory = async (owner, repo) => {
  try {
    const response = await axiosInstance.get(`/api/scan/${owner}/${repo}/history`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching scan history for ${owner}/${repo}:`, error);
    if (error.response && error.response.data && error.response.data.message) {
      throw new Error(error.response.data.message);
    }
    throw error;
  }
};

/**
 * Fetches the full details of a specific scan by its MongoDB ObjectId.
 * @param {string} scanId - The MongoDB ObjectId of the scan.
 * @returns {Promise<object>} A promise resolving to the full scan data object.
 */
export const getSpecificScan = async (scanId) => {
  try {
    const response = await axiosInstance.get(`/api/scan/${scanId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching specific scan ${scanId}:`, error);
    if (error.response && error.response.data && error.response.data.message) {
      throw new Error(error.response.data.message);
    }
    throw error;
  }
};