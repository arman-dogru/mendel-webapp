const axios = require("axios");
const { encryptData } = require("../utils/crypto");
const {
  GITHUB_CLIENT_ID,
  CALLBACK_URL,
  GITHUB_CLIENT_SECRET,
  FRONTEND_URL,
} = require("../config/env");
const { AppError } = require("../utils/errorHandler");

const startGitHubOauth = (req, res) => {
  const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${CALLBACK_URL}&scope=repo`;
  res.redirect(url);
};

const handleGitHubCallback = async (req, res, next) => {
  const { code } = req.query;

  if (!code) {
    return next(new AppError("Code not found", 400));
  }

  try {
    const response = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      },
      {
        headers: { Accept: "application/json" },
      }
    );
    const accessToken = response.data.access_token;

    if (!accessToken) {
      throw new AppError("Access token not found", 401);
    }

    const userResponse = await axios.get("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    });
    const username = userResponse.data.login;

    if (!username) {
      throw new AppError("username not found", 404);
    }

    req.session.accessToken = accessToken;
    req.session.encryptedUsername = encryptData(username);
    req.session.allowedRepositories = [];

    res.redirect(`${FRONTEND_URL}/repo-permissions`);
  } catch (error) {
    console.error("Error in callback:", error.message);
    next(error);
  }
};

const getUserData = async (req, res, next) => {
  const { token } = req.query || {};

  if (!token) {
    return next(new AppError("Token not found", 400));
  }

  try {
    const response = await axios.get("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
    res.json(response.data);
  } catch (error) {
    console.error("Error in getUserData:", error.message);
    if (error.response) {
      console.error("GitHub error details:", error.response.data);
    }
    next(new AppError("Failed to fetch user data", 500));
  }
};

const getAllUserRepos = async (req, res, next) => {
  const accessToken = req.session.accessToken;
  if (!accessToken) {
    return next(new AppError("Token not Found", 400));
  }
  try {
    const response = await axios.get(
      `https://api.github.com/user/repos?per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error("Repository error:", error.message);
    next(error);
  }
};

const saveRepoPermissions = async (req, res, next) => {
  try {
    // Get list of selected repositories from request body
    const { repositories } = req.body;

    if (!Array.isArray(repositories)) {
      return next(new AppError("Invalid repositories format", 400));
    }

    // Store the selected repositories in session
    req.session.allowedRepositories = repositories;

    res.status(200).json({
      success: true,
      message: "Repository permissions saved",
      count: repositories.length,
    });
  } catch (error) {
    console.error("Error saving repo permissions:", error.message);
    next(error);
  }
};

const getUserRepos = async (req, res, next) => {
  const accessToken = req.session.accessToken;
  if (!accessToken) {
    return next(new AppError("Token not Found", 400));
  }

  try {
    const allowedRepositories = req.session.allowedRepositories || [];

    // If user hasn't set permissions yet, redirect to permissions page
    if (!allowedRepositories.length) {
      return res.status(403).json({
        error: "Repository permissions not set",
        redirectTo: "/repo-permissions",
      });
    }

    // Get all repositories
    const response = await axios.get(
      `https://api.github.com/user/repos?per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    const filteredRepos = response.data.filter((repo) =>
      allowedRepositories.includes(repo.full_name)
    );

    res.json(filteredRepos);
  } catch (error) {
    console.error("Repository error:", error.message);
    next(error);
  }
};

const checkAuthStatus = (req, res) => {
  const isAuthenticated = !!req.session.accessToken;
  const hasSetPermissions =
    Array.isArray(req.session.allowedRepositories) &&
    req.session.allowedRepositories.length > 0;

  res.json({
    isAuthenticated,
    hasSetPermissions,
  });
};

const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session : ", err);
      return res.status(500).json({ message: "Failed to log out" });
    }
    res.clearCookie("connect.sid", {
      path: "/",
      httpOnly: true,
      secure: false,
    });

    res.json({ message: "Logged out successfully" });
  });
};

module.exports = {
  startGitHubOauth,
  handleGitHubCallback,
  getUserData,
  getUserRepos,
  getAllUserRepos,
  saveRepoPermissions,
  checkAuthStatus,
  logout,
};
