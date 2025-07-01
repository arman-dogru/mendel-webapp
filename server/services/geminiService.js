const { GoogleGenerativeAI } = require("@google/generative-ai");
const Bottleneck = require("bottleneck"); // Import bottleneck
const { GEMINI_API_KEY } = require("../config/env");
const { AppError } = require("../utils/errorHandler");

const limiter = new Bottleneck({
  maxConcurrent: 1, // Only one request active at a time
  minTime: Math.ceil(60000 / 14), // ~4286ms between requests to meet 14/min limit
});

limiter.on("error", (error) => {
  console.error("Bottleneck error:", error);
});
limiter.on("failed", (error, jobInfo) => {
  console.warn(`Bottleneck job ${jobInfo.options.id} failed:`, error);
});
limiter.on("depleted", () => {
  console.log("Bottleneck queue depleted (waiting for minTime).");
});

if (!GEMINI_API_KEY) {
  console.warn(
    "GEMINI_API_KEY is not set. Code analysis feature will be disabled."
  );
}

const genAI = GEMINI_API_KEY
  ? new GoogleGenerativeAI(GEMINI_API_KEY)
  : null;

const model = genAI
  ? genAI.getGenerativeModel({ model: "gemini-2.0-flash" }) // Note: Using a newer model like 2.0-flash is recommended for best structured output results
  : null;

/**
 * Generates content using the Gemini API.
 * @param {string | object} promptOrRequest - Either a string prompt or a full GenerateContentRequest object.
 * @returns {Promise<string>} - The generated text content.
 */
const generateContent = async (promptOrRequest) => {
  if (!model) {
    throw new AppError(
      "Gemini API key not configured or model unavailable. Analysis unavailable.",
      503
    );
  }

  try {
    console.log("Scheduling Gemini request...");
    const text = await limiter.schedule(async () => {
      console.log("Executing Gemini request...");
      // Pass the prompt string or the full request object directly to the SDK
      const result = await model.generateContent(promptOrRequest);
      const response = await result.response;
      return response.text();
    });
    console.log("Gemini request completed.");
    return text;
  } catch (error) {
    console.error("Error during Gemini API call or scheduling:", error);
    if (error.message.includes("quota")) {
      throw new AppError("Gemini API quota exceeded.", 429);
    }
    if (error.status === 400) {
      throw new AppError(
        `Gemini API Bad Request: ${
          error.message || "Check prompt structure/content."
        }`,
        400
      );
    }
    console.error(`Gemini API Error Status: ${error.status}`);

    throw new AppError(
      error.message ||
        `Failed to generate content using Gemini API. Status: ${
          error.status || "unknown"
        }`,
      error.status >= 400 && error.status < 500 ? error.status : 500
    );
  }
};

module.exports = {
  generateContent,
  isGeminiAvailable: !!model,
};