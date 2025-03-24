const { AppError } = require("../utils/errorHandler");

const checkAuth = (req, res, next) => {
  const isAuthenticated = !!req.session.accessToken;

  if (!isAuthenticated) {
    return next(new AppError("User is not authenticated", 401));
  }

  req.accessToken = req.session.accessToken;
  next();
};

module.exports = {
  checkAuth,
};
