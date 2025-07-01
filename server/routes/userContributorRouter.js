const express = require("express");
const { checkAuth } = require("../middleware/authMiddleware");
const {
  getUserContributorMetrics,
  getUserContributorActivityOverTime,
} = require("../controllers/userContributorController");

const router = express.Router();

router.get(
  "/:owner/:repo/:contributor/user_metrics",
  checkAuth,
  getUserContributorMetrics
);
router.get(
  "/:owner/:repo/contributors/:contributor/activity",
  checkAuth,
  getUserContributorActivityOverTime
);

module.exports = router;
