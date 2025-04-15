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

// export const getRepoBranches = async (owner, repo) => {
//   try {
//     const response = await axiosInstance.get(
//       `/api/repos/${owner}/${repo}/branches`,
//     );
//     return response.data;
//   } catch (error) {
//     console.error("Error fetching branches:", error);
//     throw error;
//   }
// };

// export const getRepoCommits = async (owner, repo, branch) => {
//   try {
//     const response = await axiosInstance.get(
//       `/api/repos/${owner}/${repo}/commits?branch=${branch}`,
//     );
//     return response.data;
//   } catch (error) {
//     console.error("Error fetching commits:", error);
//     throw error;
//   }
// };

// export const getRepoMerges = async (owner, repo) => {
//   try {
//     const response = await axiosInstance.get(
//       `/api/repos/${owner}/${repo}/merges`,
//     );
//     return response.data;
//   } catch (error) {
//     console.error("Error fetching merges:", error);
//     throw error;
//   }
// };

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
      `/api/repos/${owner}/${repo}/pulls?branch=${branch}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching Prs", error);
    throw error;
  }
};

// Mock implementation of getRepoBranches
export const getRepoBranches = async (owner, repo) => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Return branches from sample data
  return sampleData.branches;
};

// Mock implementation of getRepoCommits
export const getRepoCommits = async (owner, repo, branch) => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 700));

  // Filter commits by branch if specified
  if (branch && branch !== "All branches") {
    return sampleData.commits.filter((commit) => commit.branch === branch);
  }

  return sampleData.commits;
};

// Mock implementation of getRepoMerges
export const getRepoMerges = async (owner, repo) => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 600));

  // Return merges from sample data
  return sampleData.merges;
};

// Error handler utility
export const handleApiError = (error) => {
  console.error("API Error:", error);

  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    return `Error ${error.response.status}: ${error.response.data.message || "Unknown error"}`;
  } else if (error.request) {
    // The request was made but no response was received
    return "Network error. Please check your connection and try again.";
  } else {
    // Something happened in setting up the request that triggered an Error
    return `Error: ${error.message || "Unknown error occurred"}`;
  }
};
