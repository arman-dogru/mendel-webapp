const express = require("express");
const { checkAuth } = require("../middleware/authMiddleware");
const {
  getRepoCommits,
  getRepoBranches,
  getRepoPullRequests,
  getBranchCommits,
  getGitTree,
} = require("../controllers/repoController");
const router = express.Router();

router.get("/:owner/:repo/commits", checkAuth, getRepoCommits);
router.get("/:owner/:repo/branches", checkAuth, getRepoBranches);
router.get("/:owner/:repo/commits/:branch", checkAuth, getBranchCommits);
router.get("/:owner/:repo/pulls", checkAuth, getRepoPullRequests);
router.get("/:owner/:repo/git-tree", checkAuth, getGitTree);

module.exports = router;
