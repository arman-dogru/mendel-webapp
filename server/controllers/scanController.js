// controllers/scanController.js
const scanService = require('../services/scanService');
const { AppError } = require('../utils/errorHandler');

const startScan = async (req, res, next) => {
    const { owner, repo } = req.params;
    const accessToken = req.session.accessToken;

    if (!accessToken) {
        return next(new AppError("Authentication required.", 401));
    }

    if (!owner || !repo) {
        return next(new AppError("Repository owner and name are required.", 400));
    }

    try {
        // analyzeRepository now returns the structured { summary, fileAnalyses } object
        const analysisResult = await scanService.analyzeRepository(owner, repo, accessToken);
        // Return the entire structured result as JSON
        res.json(analysisResult);
    } catch (error) {
        // Pass the error to the centralized error handler
        next(error);
    }
};

module.exports = {
    startScan,
};