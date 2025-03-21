const { GITHUB_CLIENT_ID, CALLBACK_URL } = require("../config/env");

const startGitHubOauth = (req, res) => {
  const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${CALLBACK_URL}`;
  res.redirect(url);
};

module.exports = { startGitHubOauth };
