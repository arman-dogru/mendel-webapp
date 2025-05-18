const axios = require("axios");
const { encryptData } = require("../utils/crypto");
const {
  GITHUB_CLIENT_ID,
  CALLBACK_URL,
  GITHUB_CLIENT_SECRET,
  FRONTEND_URL,
  GITHUB_APP_NAME,
} = require("../config/env");
const { AppError } = require("../utils/errorHandler");
const { v4: uuidv4 } = require("uuid");

const startGitHubOauth = (req, res) => {
  const state = uuidv4();
  req.session.oauthState = state;
  const url = `https://github.com/apps/${GITHUB_APP_NAME}/installations/new?state=${state}`;
  res.redirect(url);
};

const handleGitHubCallback = async (req, res, next) => {
  const { code, installation_id, setup_action, state } = req.query;

  if (installation_id && setup_action) {
    try {
      req.session.installationId = installation_id;

      const expectedState = req.session.oauthState;
      if (!state || state !== expectedState) {
        console.error(
          `State mismatch in installation callback. Expected: ${expectedState}, Got: ${state}`
        );
        return next(new AppError("Invalid state parameter", 400));
      }
      const oauthState = uuidv4();
      req.session.oauthState = oauthState;
      const scopes = ["repo", "admin:org", "read:org", "user:email"].join(" ");
      const oauthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${CALLBACK_URL}&scope=${encodeURIComponent(
        scopes
      )}&state=${oauthState}`;
      return res.redirect(oauthUrl);
    } catch (error) {
      console.error("Error in installation callback:", error.message);
      return next(new AppError("Failed to handle installation callback", 500));
    }
  }
  if (code) {
    const expectedState = req.session.oauthState;
    if (!state || state !== expectedState) {
      console.error(
        `State mismatch in OAuth callback. Expected: ${expectedState}, Got: ${state}`
      );
      return next(new AppError("Invalid state parameter", 400));
    }
    delete req.session.oauthState;

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
        throw new AppError("Username not found", 404);
      }
      req.session.accessToken = accessToken;
      req.session.encryptedUsername = encryptData(username);
      res.redirect(`${FRONTEND_URL}/homepage`);
    } catch (error) {
      console.error("Error in OAuth callback:", error.message);
      return next(error);
    }
  } else {
    return next(new AppError("Missing code or installation_id", 400));
  }
};

const handleGitHubInstallation = async (req, res, next) => {
  try {
    const state = uuidv4();
    req.session.oauthState = state;
    const url = `https://github.com/apps/${GITHUB_APP_NAME}/installations/new?state=${state}`;
    res.redirect(url);
  } catch (error) {
    console.error("Error initiating GitHub App installation:", error.message);
    return next(
      new AppError("Failed to initiate GitHub App installation", 500)
    );
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
    return next(new AppError("Token not found", 400));
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

const getUserRepos = async (req, res, next) => {
  const accessToken = req.session.accessToken;
  const installationId = req.session.installationId;

  if (!accessToken || !installationId) {
    return next(new AppError("Token or installation_id not found", 400));
  }

  try {
    const response = await axios.get(
      `https://api.github.com/user/installations/${installationId}/repositories`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    const repos = response.data.repositories;
    res.json(repos);
  } catch (error) {
    console.error("Repository error:", error.message);
    next(new AppError("Failed to fetch repositories", 500));
  }
};

const checkAuthStatus = (req, res) => {
  const isAuthenticated = !!req.session.accessToken;
  res.json({
    isAuthenticated,
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
  checkAuthStatus,
  logout,
  handleGitHubInstallation,
};
