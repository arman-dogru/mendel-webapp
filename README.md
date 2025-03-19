```
/my-web-app
├── client
│   ├── public
│   │   └── index.html
│   └── src
│       ├── assets
│       │   ├── images
│       │   │   └── (design mockup images, icons, etc.)
│       │   └── styles
│       │       └── global.css
│       ├── components
│       │   ├── Navbar
│       │   │   ├── Navbar.jsx
│       │   │   └── Navbar.css
│       │   ├── GitTree
│       │   │   ├── GitTree.jsx
│       │   │   └── GitTree.css
│       │   ├── Dashboard
│       │   │   ├── Dashboard.jsx
│       │   │   └── Dashboard.css
│       │   ├── RepositoryDetails
│       │   │   ├── RepositoryDetails.jsx
│       │   │   └── RepositoryDetails.css
│       │   └── TeamCard
│       │       ├── TeamCard.jsx
│       │       └── TeamCard.css
│       ├── pages
│       │   ├── HomePage.jsx
│       │   ├── RepoPage.jsx
│       │   ├── PRsPage.jsx
│       │   ├── IssuesPage.jsx
│       │   └── TeamPage.jsx
│       ├── utils
│       │   └── api.js           // API helper for client-server communication
│       ├── App.jsx              // Main application component (includes route definitions)
│       ├── index.jsx            // Entry point for React
│       └── routes.jsx           // Optional: modular route configuration for react-router
├── server
│   ├── config
│   │   ├── db.js              // MongoDB connection setup
│   │   ├── passport.js        // GitHub OAuth strategy configuration
│   │   └── gemini.js          // Gemini LLM API configuration
│   ├── controllers
│   │   ├── authController.js  // Handles authentication requests
│   │   ├── repoController.js  // Handles repository-related logic (code review, scans, etc.)
│   │   ├── teamController.js  // Handles team and contributor endpoints
│   │   └── dashboardController.js // Serves data for various dashboards/charts
│   ├── middleware
│   │   ├── authMiddleware.js  // Middleware to protect routes (JWT, session, etc.)
│   │   └── errorMiddleware.js // Global error handling
│   ├── models
│   │   ├── User.js            // Mongoose model for user profiles
│   │   ├── Repository.js      // Model for repository details, branches, issues, PRs, etc.
│   │   ├── PullRequest.js     // Model for PR information and review statuses
│   │   ├── Issue.js           // Model for issues and GitHub labels/tags
│   │   └── Contributor.js     // Model for tracking contributor stats and performance
│   ├── routes
│   │   ├── authRoutes.js      // Routes for login, callback (GitHub OAuth), etc.
│   │   ├── repoRoutes.js      // Routes for repository data (scans, charts, graphs, Git Tree)
│   │   ├── teamRoutes.js      // Routes for team and contributor data
│   │   └── dashboardRoutes.js // Routes to serve dashboard metrics (PR reviews, security issues, etc.)
│   ├── services
│   │   ├── githubService.js   // Abstraction for GitHub API calls (PR review, issue linking, etc.)
│   │   ├── geminiService.js   // Service for communicating with the Gemini LLM API
│   │   └── scanService.js     // Service for performing code scans (docstrings, complexity, duplication, etc.)
│   ├── utils
│   │   ├── logger.js          // Logging utility (e.g., winston, morgan integration)
│   │   └── errorHandler.js    // Custom error formatter/handler
│   ├── app.js                 // Express app configuration (middleware, routes, etc.)
│   └── server.js              // Server entry point (bootstraps the app)
├── .env                       // Environment variables (DB connection, OAuth secrets, etc.)
├── .gitignore                 // Files and folders to ignore in Git
├── package.json               // Project metadata and dependencies
└── README.md                  // Project documentation and setup instructions
```

---

- **Client (React Frontend):**
  - **assets:** Stores static resources like images and global styles.
  - **components:** Contains reusable UI components (e.g., Navbar, Git Tree visualization, Dashboard panels, Team cards) that are assembled into pages.
  - **pages:** Defines the primary screens of the web app (HomePage, Repository details with tabs for PRs, Issues, code review, etc., and the Team Page).
  - **utils:** Includes helper functions (e.g., API calls) to facilitate communication with the backend.
  - **App.jsx / index.jsx / routes.jsx:** Bootstrapping and routing configurations to enable client-side navigation.

- **Server (Express Backend):**
  - **config:** Manages setup for MongoDB, GitHub OAuth (via Passport.js), and Gemini LLM API integration.
  - **controllers:** Encapsulates the business logic for authentication, repository management (including scans and PR/issue handling), team data, and dashboards.
  - **middleware:** Contains route protection (authentication) and error handling logic.
  - **models:** Defines Mongoose schemas and models for Users, Repositories, Pull Requests, Issues, and Contributors.
  - **routes:** Sets up API endpoints corresponding to the different aspects of the application (auth, repo, team, dashboard).
  - **services:** Provides integration layers with external APIs such as GitHub and Gemini, and implements scanning logic for the repository code.
  - **utils:** Utility files for logging and error handling that assist in maintaining a robust server-side application.
  - **app.js & server.js:** Configure and start the Express application.