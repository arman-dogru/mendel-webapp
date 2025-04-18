// routes/scanRoutes.js
const express = require("express");
const { checkAuth } = require("../middleware/authMiddleware");
const scanController = require("../controllers/scanController");

const router = express.Router();

// POST /api/scan/:owner/:repo - Start a new scan (or get cached for latest commit)
router.post("/:owner/:repo", checkAuth, scanController.startScan);

// GET /api/scan/:owner/:repo/history - Get list of past scans (summary)
router.get("/:owner/:repo/history", checkAuth, scanController.getScanHistory);

// GET /api/scan/:scanId - Get details of a specific past scan by ID
router.get("/:scanId", checkAuth, scanController.getSpecificScan);

module.exports = router;