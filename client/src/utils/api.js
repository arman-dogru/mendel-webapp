import axios from "axios";
const VITE_BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:5000";

const axiosInstance = axios.create({
  withCredentials: true,
});

export const getUserRepos = async () => {
  try {
    const response = await axiosInstance.get(`${VITE_BASE_URL}/api/auth/repos`);
    return response.data;
  } catch (error) {
    console.error("Error fetching repositories:", error);
    throw error;
  }
};

export const checkAuthStatus = async () => {
  try {
    const response = await axiosInstance.get(
      `${VITE_BASE_URL}/api/auth/check-auth/status`
    );
    return response.data.isAuthenticated;
  } catch (error) {
    console.error("Error checking auth status:", error);
    return false;
  }
};
