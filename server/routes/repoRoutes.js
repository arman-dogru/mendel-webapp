const express = require("express");
const { checkAuth } = require("../middleware/authMiddleware");
const {
  getRepoBranches,
  getRepoCommits,
  getRepoMerges,
  getRepoIssues,
  getRepoPR,
  getRepoContributors,
} = require("../controllers/repoController");

const router = express.Router();

router.get("/:owner/:repo/branches", checkAuth, getRepoBranches);
router.get("/:owner/:repo/commits", checkAuth, getRepoCommits);
router.get("/:owner/:repo/merges", checkAuth, getRepoMerges);
router.get("/:owner/:repo/issues", checkAuth, getRepoIssues);
router.get("/:owner/:repo/pull-requests", checkAuth, getRepoPR);
router.get("/:owner/:repo/contributors", checkAuth, getRepoContributors);

module.exports = router;
