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
      `/api/repos/${owner}/${repo}/pulls?branch=${branch}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching Prs", error);
    throw error;
  }
};
