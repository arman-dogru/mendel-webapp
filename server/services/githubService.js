const axios = require("axios");
const { AppError } = require("../utils/errorHandler");

const GITHUB_API_BASE_URL = "https://api.github.com";

const githubApiRequest = async (url, accessToken, params = {}) => {
    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/vnd.github+json",
            },
            params,
        });
        return response.data;
    } catch (error) {
        handleGithubError(error);
    }
};

const handleGithubError = (error) => {
    if (axios.isAxiosError(error) && error.response) {
        const { status, data } = error.response;
        console.error(`GitHub API Error (${status}):`, data.message || data);
        if (status === 403 || status === 429) {
            // Check for rate limit specific message
            const rateLimitReset = error.response.headers['x-ratelimit-reset'];
            const resetTime = rateLimitReset ? new Date(rateLimitReset * 1000).toLocaleTimeString() : 'unknown';
            throw new AppError(`GitHub API rate limit exceeded. Try again after ${resetTime}.`, 429);
        }
        if (status === 404) {
            throw new AppError("GitHub resource not found.", 404);
        }
        if (status === 401) {
            throw new AppError("Invalid GitHub credentials.", 401);
        }
        throw new AppError(
            `GitHub API error: ${data.message || "Unknown error"}`,
            status
        );
    }
    console.error("Network or other error contacting GitHub:", error);
    throw new AppError("Failed to reach GitHub API.", 503);
};


const getRepoDefaultBranch = async (owner, repo, accessToken) => {
    const url = `${GITHUB_API_BASE_URL}/repos/${owner}/${repo}`;
    const repoData = await githubApiRequest(url, accessToken);
    return repoData.default_branch;
};

const getRepoTree = async (owner, repo, branch, accessToken) => {
    // First get the commit SHA for the branch
    const branchUrl = `${GITHUB_API_BASE_URL}/repos/${owner}/${repo}/branches/${branch}`;
    const branchData = await githubApiRequest(branchUrl, accessToken);
    const commitSha = branchData.commit.sha;

    // Then get the tree recursively
    const treeUrl = `${GITHUB_API_BASE_URL}/repos/${owner}/${repo}/git/trees/${commitSha}?recursive=1`;
    const treeData = await githubApiRequest(treeUrl, accessToken);

    if (treeData.truncated) {
         console.warn(`Repository ${owner}/${repo} tree is truncated. Some files may be missed.`);
    }
    return treeData.tree; // Array of file/dir objects { path, type, sha, size, url }
};

const getFileContent = async (owner, repo, fileSha, accessToken) => {
    // Use the git/blobs API for potentially better performance and handling large files
    const url = `${GITHUB_API_BASE_URL}/repos/${owner}/${repo}/git/blobs/${fileSha}`;
    try {
         const blobData = await githubApiRequest(url, accessToken);
         if (blobData.encoding !== 'base64') {
             console.warn(`Unexpected encoding for blob ${fileSha}: ${blobData.encoding}`);
             // Try to decode as UTF-8 anyway, might fail for binary
             try {
                return Buffer.from(blobData.content, blobData.encoding).toString('utf-8');
             } catch (decodeError) {
                console.error(`Failed to decode content for blob ${fileSha} with encoding ${blobData.encoding}`);
                return null; // Skip file if decoding fails
             }
         }
         // Decode base64 content
         return Buffer.from(blobData.content, 'base64').toString('utf-8');
    } catch(error) {
         // Handle specific case where blob might be too large for API to return content directly
         if (error instanceof AppError && error.statusCode === 422) { // Unprocessable Entity often means too large
            console.warn(`File with SHA ${fileSha} might be too large to fetch content via blob API. Skipping.`);
            return null;
         }
          // If it's a 404 maybe it was removed between tree fetch and content fetch
         if (error instanceof AppError && error.statusCode === 404) {
             console.warn(`File with SHA ${fileSha} not found (possibly removed). Skipping.`);
             return null;
         }
         // Re-throw other errors
         throw error;
    }

};

module.exports = {
    getRepoDefaultBranch,
    getRepoTree,
    getFileContent,
    // Expose githubApiRequest if needed elsewhere, or keep it internal
};