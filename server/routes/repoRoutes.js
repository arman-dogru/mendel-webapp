const express = require("express");
const { checkAuth } = require("../middleware/authMiddleware");
const {
  getRepoBranches,
  getRepoCommits,
  getRepoMerges,
} = require("../controllers/repoController");

const router = express.Router();

router.get("/:owner/:repo/branches", checkAuth, getRepoBranches);
router.get("/:owner/:repo/commits", checkAuth, getRepoCommits);
router.get("/:owner/:repo/merges", checkAuth, getRepoMerges);

module.exports = router;
