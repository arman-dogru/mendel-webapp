const express = require("express");
const { checkAuth } = require("../middleware/authMiddleware");
const {
  startGitHubOauth,
  handleGitHubCallback,
  getUserData,
  getUserRepos,
  checkAuthStatus,
} = require("../controllers/authController");
const router = express.Router();

router.get("/login", startGitHubOauth);
router.get("/github/callback", handleGitHubCallback);
router.get("/user", getUserData);
router.get("/repos", checkAuth, getUserRepos);
router.get("/check-auth/status", checkAuthStatus);

module.exports = router;
