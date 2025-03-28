import axios from "axios";
const VITE_BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:5000";

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

export const getRepoCommits = async (owner, repo) => {
  try {
    const response = await axiosInstance.get(
      `/api/repos/${owner}/${repo}/commits`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching commits:", error);
    throw error;
  }
};

export const getBranchCommits = async (owner, repo, branch, page = 1) => {
  try {
    const response = await axiosInstance.get(
      `/api/repos/${owner}/${repo}/commits/${branch}`,
      {
        params: {
          page,
          per_page: 100,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching commits for branch ${branch}:`, error);
    if (error.response && error.response.status === 404) {
      return [];
    }
    throw error;
  }
};

export const getRepoPullRequests = async (owner, repo) => {
  try {
    const response = await axiosInstance.get(
      `/api/repos/${owner}/${repo}/pulls`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching pull requests:", error);
    throw error;
  }
};

export const getGitTree = async (owner, repo) => {
  try {
    const response = await axiosInstance.get(
      `/api/repos/${owner}/${repo}/git-tree`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching git tree data:", error);
    if (error.response && error.response.status === 404) {
      return { branches: [], commits: [] };
    }
    throw error;
  }
};
