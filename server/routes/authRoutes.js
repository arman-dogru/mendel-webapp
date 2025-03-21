const express = require("express");
const {
  startGitHubOauth,
  handleGitHubCallback,
  getUserData,
  getUserRepos,
} = require("../controllers/authController");
const router = express.Router();

router.get("/login", startGitHubOauth);
router.get("/github/callback", handleGitHubCallback);
router.get("/user", getUserData);
router.get("/repos", getUserRepos);

module.exports = router;
