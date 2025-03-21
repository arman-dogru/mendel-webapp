require("dotenv").config();
module.exports = {
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
  CALLBACK_URL: process.env.CALLBACK_URL,
};
