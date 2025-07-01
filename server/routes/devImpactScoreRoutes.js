const express = require("express");
const {
  calculateDeveloperImpactScore,
} = require("../controllers/devImpactScoreController");
const { checkAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/calculate", checkAuth, calculateDeveloperImpactScore);

module.exports = router;
