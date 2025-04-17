const express = require("express");
const { checkAuth } = require("../middleware/authMiddleware");
const scanController = require("../controllers/scanController");

const router = express.Router();

// Use POST as it initiates a potentially long-running action
router.post("/:owner/:repo", checkAuth, scanController.startScan);

module.exports = router;