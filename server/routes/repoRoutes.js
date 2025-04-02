const express = require("express");
const { checkAuth } = require("../middleware/authMiddleware");
const {
  getRepoBranches,
  getRepoCommits,
  getRepoMerges,
  getRepoIssues,
} = require("../controllers/repoController");

const router = express.Router();

router.get("/:owner/:repo/branches", checkAuth, getRepoBranches);
router.get("/:owner/:repo/commits", checkAuth, getRepoCommits);
router.get("/:owner/:repo/merges", checkAuth, getRepoMerges);
router.get("/:owner/:repo/issues", checkAuth, getRepoIssues);

module.exports = router;
