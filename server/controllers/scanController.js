const scanService = require('../services/scanService');
const { AppError } = require('../utils/errorHandler');

const startScan = async (req, res, next) => {
    const { owner, repo } = req.params;
    const accessToken = req.session.accessToken; // Assuming checkAuth middleware adds this

    if (!accessToken) {
        return next(new AppError("Authentication required.", 401));
    }

    if (!owner || !repo) {
        return next(new AppError("Repository owner and name are required.", 400));
    }

    try {
        const report = await scanService.analyzeRepository(owner, repo, accessToken);
        res.json({ report });
    } catch (error) {
        // Pass the error to the centralized error handler
        next(error);
    }
};

module.exports = {
    startScan,
};