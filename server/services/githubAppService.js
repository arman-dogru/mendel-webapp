// server/services/githubAppService.js
const { GITHUB_APP_ID, GITHUB_PRIVATE_KEY } = require("../config/env");
const { AppError } = require("../utils/errorHandler");

// --- Change: Lazy initialize the App instance ---
let appInstance = null;

/**
 * Gets or initializes the Octokit App instance using dynamic import.
 */
async function getAppInstance() {
  if (!appInstance) {
    if (!GITHUB_APP_ID || !GITHUB_PRIVATE_KEY) {
      console.error(
        "FATAL ERROR: GITHUB_APP_ID or GITHUB_PRIVATE_KEY is missing."
      );
      // Decide how to handle this - throw, exit, etc.
      throw new AppError("GitHub App credentials missing", 500);
    }
    try {
      console.log("Dynamically importing @octokit/app...");
      // Use dynamic import() which works in CommonJS modules
      const octokitAppModule = await import("@octokit/app");
      const App = octokitAppModule.App; // Access the named export

      console.log("Initializing Octokit App instance...");
      appInstance = new App({
        // Create instance after successful import
        appId: GITHUB_APP_ID,
        privateKey: GITHUB_PRIVATE_KEY,
      });
      console.log("Octokit App instance initialized.");
    } catch (importError) {
      console.error(
        "Failed to dynamically import or initialize @octokit/app:",
        importError
      );
      throw new AppError(
        `Failed to load GitHub App module: ${importError.message}`,
        500
      );
    }
  }
  return appInstance;
}
// --- End Change ---

const installationOctokitCache = new Map(); // Simple in-memory cache

/**
 * Gets an Octokit instance authenticated as a specific installation.
 * Caches the instance based on installationId.
 * @param {number} installationId - The installation ID of the GitHub App.
 * @returns {Promise<Octokit>} - An authenticated Octokit instance.
 */
async function getInstallationOctokit(installationId) {
  if (!installationId) {
    throw new AppError(
      "Installation ID is required to get authenticated Octokit instance",
      400
    );
  }

  // Check cache first (optional) - See previous implementation if needed

  try {
    // --- Change: Ensure the App instance is retrieved ---
    const app = await getAppInstance(); // Get the initialized App instance
    // --- End Change ---

    console.log(
      `Authenticating Octokit for installation ID: ${installationId}`
    );
    const installationOctokit = await app.getInstallationOctokit(
      installationId
    ); // Use the instance
    // Cache the authenticated instance if desired
    return installationOctokit;
  } catch (error) {
    console.error(
      `Error getting Octokit instance for installation ${installationId}:`,
      error
    );
    // Keep existing error handling...
    if (error instanceof AppError) throw error; // Re-throw AppErrors
    if (error.status === 404) {
      throw new AppError(
        `GitHub App installation not found (ID: ${installationId}). Ensure the app is installed on the repository.`,
        404
      );
    }
    if (error.status === 401) {
      throw new AppError(
        `Authentication failed for GitHub App installation (ID: ${installationId}). Check App credentials or permissions.`,
        401
      );
    }
    throw new AppError(
      `Failed to get installation Octokit: ${error.message}`,
      500
    );
  }
}

module.exports = {
  getInstallationOctokit,
};
