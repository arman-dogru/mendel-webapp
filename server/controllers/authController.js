const axios = require("axios");
const {
  GITHUB_CLIENT_ID,
  CALLBACK_URL,
  GITHUB_CLIENT_SECRET,
  FRONTEND_URL,
} = require("../config/env");
const { AppError } = require("../utils/errorHandler");

const startGitHubOauth = (req, res) => {
  const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${CALLBACK_URL}`;
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
      throw new AppError("Failed to fetch username", 500);
    }

    req.session.accessToken = accessToken;
    req.session.username = username;
    res.redirect(`${FRONTEND_URL}/homepage`);
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

const getUserRepos = async (req, res, next) => {
  const accessToken = req.session.accessToken;
  if (!accessToken) {
    return next(new AppError("Token not Found", 400));
  }
  try {
    const response = await axios.get(`https://api.github.com/user/repos`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });
    res.json(response.data);
  } catch (error) {
    console.error("Repository error:", error.message);
    next(error);
  }
};

const checkAuthStatus = (req, res) => {
  const isAuthenticated = !!req.session.accessToken;
  res.json({ isAuthenticated });
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
  checkAuthStatus,
  logout,
};
