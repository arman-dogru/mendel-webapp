const express = require("express");
const { startGitHubOauth } = require("../controllers/authController");
const router = express.Router();

router.get("/login", startGitHubOauth);

module.exports = router;
