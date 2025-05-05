// server/server.js
const express = require("express");
const session = require("express-session");
const cors = require("cors");
// const passport = require("passport"); // Assuming passport might still be used elsewhere
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorMiddleware");
const { AppError } = require("./utils/errorHandler"); // Import AppError for cleaner error handling
const {
  FRONTEND_URL,
  SESSION_SECRET,
  PORT,
  GITHUB_APP_ID, // Check if App ID is loaded
  GITHUB_PRIVATE_KEY, // Check if Private Key is loaded
  GITHUB_WEBHOOK_SECRET // Check if Webhook Secret is loaded
} = require("./config/env");

// --- Route Imports ---
const authRoutes = require("./routes/authRoutes");
const repoRoutes = require("./routes/repoRoutes");
const scanRoutes = require("./routes/scanRoutes");
const webhookRoutes = require("./routes/webhookRoutes"); // Import webhook routes
// Import other routes (dashboard, team) if they exist

// --- Initial Checks ---
console.log("--- Environment Configuration ---");
console.log(`Frontend URL: ${FRONTEND_URL}`);
console.log(`Session Secret Loaded: ${!!SESSION_SECRET}`);
console.log(`Server Port: ${PORT}`);
console.log(`GitHub App ID Loaded: ${!!GITHUB_APP_ID}`);
console.log(`GitHub Private Key Loaded: ${!!GITHUB_PRIVATE_KEY}`);
console.log(`GitHub Webhook Secret Loaded: ${!!GITHUB_WEBHOOK_SECRET}`);
console.log("------------------------------");

if (!SESSION_SECRET || !FRONTEND_URL || !PORT ) {
    console.error("FATAL ERROR: Missing essential environment variables (SESSION_SECRET, FRONTEND_URL, PORT).");
    process.exit(1);
}
// Add checks for App ID/Key/Secret if they are absolutely critical for startup
if (!GITHUB_APP_ID || !GITHUB_PRIVATE_KEY || !GITHUB_WEBHOOK_SECRET) {
     console.warn("WARNING: GitHub App/Webhook environment variables (GITHUB_APP_ID, GITHUB_PRIVATE_KEY, GITHUB_WEBHOOK_SECRET) are missing. Webhook features may fail.");
     // Decide if this should be a fatal error: process.exit(1);
}

const app = express();

// --- Database Connection ---
connectDB();

// --- Base Middlewares (Apply Cors Early) ---
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

// --- Webhook Route Specific Middleware (BEFORE global JSON parser) ---
// Apply RAW body parser ONLY for the webhook route path
app.use('/api/webhook/github', express.raw({ type: 'application/json', limit: '10mb' }), (req, res, next) => {
    // Attach the raw buffer to req.rawBody for the signature verification middleware
    // express.raw places the buffer into req.body when the type matches
    if (Buffer.isBuffer(req.body)) {
        req.rawBody = req.body;
         // console.log('Raw body buffer attached for webhook.'); // Optional debug log
    } else {
        // This case shouldn't typically happen if GitHub sends correct content-type
        // but good to handle defensively.
        console.error('Webhook Error: express.raw() did not yield a buffer. Body type:', typeof req.body);
        // Stop processing if the raw body isn't available
        return next(new AppError("Failed to get raw body for webhook signature.", 500));
    }
    next();
});
// Mount the webhook router AFTER the raw parser for its specific path
// It will now have access to req.rawBody
app.use("/api/webhook", webhookRoutes);


// --- Global JSON and URLencoded parsers (AFTER webhook route has been handled) ---
// These will apply to all subsequent routes like /api/auth, /api/repo, etc.
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


// --- Session Management (AFTER body parsers, BEFORE routes using sessions) ---
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false, // Good default
    cookie: {
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: process.env.NODE_ENV === "production" ? 'none' : 'lax', // Adjust SameSite as needed
    },
    // Consider using connect-mongo for session storage in production
  })
);

// --- Passport Initialization (If still needed) ---
// app.use(passport.initialize());
// app.use(passport.session());
// require('./config/passport')(passport);

// --- Other API Routes (These will use the global JSON parser) ---
app.use("/api/auth", authRoutes);
app.use("/api/repo", repoRoutes); // Will have req.body parsed as JSON
app.use("/api/scan", scanRoutes); // Will have req.body parsed as JSON
// app.use('/api/dashboard', dashboardRoutes);
// app.use('/api/team', teamRoutes);


// --- Health Check Endpoint ---
app.get("/health", (req, res) => {
  res.status(200).json({ status: "UP", timestamp: new Date().toISOString() });
});

// --- Global Error Handler (Must be last) ---
app.use(errorHandler);

// --- Start Server ---
const serverPort = PORT || 5001;
app.listen(serverPort, () => {
  console.log(`🚀 Server listening on port ${serverPort}`);
  console.log(`🔗 Frontend should connect to: http://localhost:${serverPort}`);
});