```
.
├── client
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── public
│   │   ├── MENDEL_LAB_LOGO-nobackground.png
│   │   └── vite.svg
│   ├── README.md
│   ├── src
│   │   ├── App.jsx
│   │   ├── components
│   │   │   ├── CodeAnalysis
│   │   │   │   ├── CodeAnalysisComponent.css
│   │   │   │   └── CodeAnalysisComponent.jsx
│   │   │   ├── ExportReportButton
│   │   │   │   └── ExportReportButtonComponent.jsx
│   │   │   ├── HomePageNavbar
│   │   │   │   └── HomePageNavbar.jsx
│   │   │   ├── Issues
│   │   │   │   ├── issuesComponent.css
│   │   │   │   └── IssuesComponent.jsx
│   │   │   ├── LoginButton
│   │   │   │   ├── LoginButton.css
│   │   │   │   └── LoginButton.jsx
│   │   │   ├── Navbar
│   │   │   │   └── Navbar.jsx
│   │   │   ├── PRDetailChatbot
│   │   │   │   └── PRDetailChatbot.jsx
│   │   │   ├── PRs
│   │   │   │   ├── PRs.css
│   │   │   │   └── PRs.jsx
│   │   │   ├── RepoCards
│   │   │   │   ├── RepoCards.css
│   │   │   │   └── RepoCards.jsx
│   │   │   ├── RepoMetrics
│   │   │   │   ├── RepoMetrics.css
│   │   │   │   └── RepoMetrics.jsx
│   │   │   └── Teams
│   │   │       ├── TeamComponents.css
│   │   │       └── TeamsComponents.jsx
│   │   ├── context
│   │   │   └── RepoContext.jsx
│   │   ├── index.css
│   │   ├── main.jsx
│   │   ├── pages
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── HomePage.jsx
│   │   │   └── LoginPage.jsx
│   │   ├── routes
│   │   │   └── ProtectedRoute.jsx
│   │   ├── styles
│   │   │   └── global.css
│   │   └── utils
│   │       ├── api.js
│   │       └── errorHandler.js
│   └── vite.config.js
├── package-lock.json
├── package.json
├── README.md
└── server
    ├── config
    │   ├── db.js
    │   ├── env.js
    │   ├── gemini.js
    │   └── passport.js
    ├── controllers
    │   ├── authController.js
    │   ├── dashboardController.js
    │   ├── repoController.js
    │   ├── scanController.js
    │   ├── teamController.js
    │   └── webhookController.js
    ├── mendel-ai-github-assistant.private-key.pem
    ├── middleware
    │   ├── authMiddleware.js
    │   ├── errorMiddleware.js
    │   └── verifySignature.js
    ├── models
    │   ├── Contributor.js
    │   ├── Issue.js
    │   ├── PullRequest.js
    │   ├── Repository.js
    │   ├── Scan.js
    │   └── User.js
    ├── package-lock.json
    ├── package.json
    ├── routes
    │   ├── authRoutes.js
    │   ├── dashboardRoutes.js
    │   ├── repoRoutes.js
    │   ├── scanRoutes.js
    │   ├── teamRoutes.js
    │   └── webhookRoutes.js
    ├── server.js
    ├── services
    │   ├── geminiService.js
    │   ├── githubAppService.js
    │   ├── githubService.js
    │   └── scanService.js
    └── utils
        ├── crypto.js
        ├── errorHandler.js
        └── logger.js

29 directories, 76 files
```

This repository contains a full-stack web application designed as a GitHub analysis and assistance tool. It features a React frontend for the user interface and a Node.js/Express backend to handle API requests, authentication, database interactions, and communication with external services like the GitHub API and Google's Gemini AI for code analysis.

The application allows users to log in with their GitHub account, view their repositories, and perform in-depth analysis on them. Key features include:
*   **AI-Powered Code Scanning:** Analyzes repository code for potential bugs, security vulnerabilities, and code quality issues using the Gemini LLM.
*   **Dashboard & Metrics:** Provides visualizations and metrics on repository activity, such as Pull Request (PR) merge times and contributor statistics.
*   **PR and Issue Tracking:** A dedicated interface to view and filter PRs and issues for a selected repository.
*   **Automated PR Reviews:** A GitHub App component that can be installed on repositories to automatically post AI-generated code reviews on new pull requests.

---

### **Root Directory**

*   **`package.json`**: Defines the project's scripts and dependencies for the entire repository, often used to manage both the client and server workspaces.
*   **`package-lock.json`**: An auto-generated file that locks the versions of the project's dependencies to ensure consistent installations across different environments.
*   **`README.md`**: The main documentation for the entire project, providing an overview, setup instructions, and other essential information.

---

### **`client`** (Frontend - React/Vite)

The `client` directory contains the single-page application (SPA) that users interact with.

*   **`eslint.config.js`**: Configuration file for ESLint, a tool for identifying and reporting on patterns in JavaScript code to maintain code quality.
*   **`index.html`**: The main HTML file and entry point for the Vite application. The React app is mounted into this file.
*   **`package.json`**: Manages the frontend application's dependencies (like React, Material UI, Tailwind CSS) and scripts (like `dev`, `build`).
*   **`package-lock.json`**: Locks the specific versions of the frontend dependencies.
*   **`vite.config.js`**: Configuration file for Vite, the frontend build tool used for development and production bundling.

#### `client/public/`

This directory holds static assets that are publicly accessible.

*   **`MENDEL_LAB_LOGO-nobackground.png`**: The logo image for the Mendel Lab application.
*   **`vite.svg`**: The default Vite logo, likely a placeholder or part of the initial project setup.

#### `client/src/`

This is the main source code directory for the React application.

*   **`App.jsx`**: The root component of the application. It sets up the main application structure and routing using `react-router-dom`.
*   **`index.css`**: The main stylesheet entry point, which imports Tailwind CSS and global styles.
*   **`main.jsx`**: The entry point of the React application. It renders the `App` component into the DOM.

##### `client/src/components/`

Contains reusable UI components that are used across different pages.

*   **`CodeAnalysis/CodeAnalysisComponent.jsx`**: The core component for the code analysis feature. It handles triggering scans, displaying loading states, showing analysis results (summary, dashboard, issue list), and opening a detailed modal for each issue.
*   **`CodeAnalysis/CodeAnalysisComponent.css`**: Styles specific to the `CodeAnalysisComponent`.
*   **`ExportReportButton/ExportReportButtonComponent.jsx`**: A button component that allows users to export the code analysis report as a PDF or CSV file.
*   **`HomePageNavbar/HomePageNavbar.jsx`**: The navigation bar displayed on the homepage, including the logo, user profile menu, and notification/settings icons.
*   **`Issues/IssuesComponent.jsx`**: A component for displaying and filtering GitHub issues for a selected repository. It allows filtering by status (open/closed), labels, author, and time frame.
*   **`Issues/issuesComponent.css`**: Styles specific to the `IssuesComponent`.
*   **`LoginButton/LoginButton.jsx`**: A simple UI component that renders a "Sign in with GitHub" button, initiating the OAuth login flow.
*   **`Navbar/Navbar.jsx`**: The navigation bar used within the main dashboard view. It includes navigation links to switch between different tabs (Dashboards, PRs, Issues, Analysis) and user action buttons.
*   **`PRDetailChatbot/PRDetailChatbot.jsx`**: A modal or side-panel component that displays detailed information about a selected Pull Request and includes an AI-powered chatbot for discussing the PR.
*   **`PRs/PRs.jsx`**: A component that fetches and displays a list of Pull Requests for a repository. It categorizes PRs (e.g., "Needs your review", "Merged") and allows filtering by branch.
*   **`PRs/PRs.css`**: Styles specific to the `PRs` component.
*   **`RepoCards/RepoCards.jsx`**: A component that renders a grid of cards, each representing a user's repository. Clicking a card navigates to that repository's dashboard.
*   **`RepoCards/RepoCards.css`**: Styles for the repository cards.
*   **`RepoMetrics/RepoMetrics.jsx`**: A component that displays analytical charts and key metrics for a repository, such as PR merge time and branch creation trends.
*   **`RepoMetrics/RepoMetrics.css`**: Styles for the repository metrics and charts.
*   **`Teams/TeamsComponents.jsx`**: A component that displays team-related information, primarily a list of repository contributors and their contribution counts. It also embeds the `RepoMetricsComponent`.
*   **`Teams/TeamComponents.css`**: Styles for the `Teams` component.

##### `client/src/context/`

*   **`RepoContext.jsx`**: A React Context provider that holds and shares the state of the currently selected repository across the entire application, avoiding the need to pass props down through many levels.

##### `client/src/pages/`

These components represent the main pages or views of the application.

*   **`DashboardPage.jsx`**: The main page for a specific repository. It acts as a container that renders different components (Issues, PRs, Analysis, etc.) based on the currently active tab.
*   **`HomePage.jsx`**: The page users land on after logging in. It displays a list of their repositories and includes a search bar to filter them.
*   **`LoginPage.jsx`**: The initial page for unauthenticated users, featuring the login button.

##### `client/src/routes/`

*   **`ProtectedRoute.jsx`**: A higher-order component that wraps around routes to protect them. It checks if the user is authenticated before rendering the child components; otherwise, it redirects to the login page.

##### `client/src/styles/`

*   **`global.css`**: Contains global CSS variables (for colors, fonts, etc.) and styles that apply to the entire application.

##### `client/src/utils/`

Contains utility functions and helpers for the frontend.

*   **`api.js`**: Centralizes all API calls from the client to the backend server. It uses `axios` to make HTTP requests for authentication, repository data, scans, and more.
*   **`errorHandler.js`**: A utility function to parse and format error messages received from the API, providing user-friendly feedback.

---

### **`server`** (Backend - Node.js/Express)

The `server` directory contains the backend logic, API endpoints, and database models.

*   **`mendel-ai-github-assistant.private-key.pem`**: The private key for the GitHub App. This file is crucial for authenticating the application as a GitHub App to perform actions like automated code reviews.
*   **`package.json`**: Manages the backend's dependencies (like Express, Mongoose, Axios) and scripts.
*   **`package-lock.json`**: Locks the specific versions of the backend dependencies.
*   **`server.js`**: The main entry point for the backend application. It initializes the Express server, sets up middleware (CORS, session management, body parsing), configures routes, and starts listening for requests. It includes special logic to parse the raw request body for webhook verification.

#### `server/config/`

Contains configuration files for various parts of the backend.

*   **`db.js`**: Configures and establishes the connection to the MongoDB database using Mongoose.
*   **`env.js`**: Loads environment variables from a `.env` file using `dotenv` and exports them for use throughout the server. It includes logic to correctly read the multiline private key.
*   **`gemini.js`**: (Empty) Intended for Gemini API configuration, but logic is currently in `geminiService.js`.
*   **`passport.js`**: (Empty) Intended for Passport.js authentication strategy configurations, though the app currently uses a custom session-based flow.

#### `server/controllers/`

Contain the business logic for handling requests to API endpoints.

*   **`authController.js`**: Handles all authentication-related logic, including the GitHub OAuth2 flow, creating user sessions, logging out, and fetching user-specific repositories from GitHub.
*   **`dashboardController.js`**: (Empty) Placeholder for logic related to the main dashboard view.
*   **`repoController.js`**: Manages requests for repository-specific data, such as branches, commits, issues, pull requests, contributors, and detailed metrics, by calling the GitHub API.
*   **`scanController.js`**: Orchestrates the code scanning process. It checks for cached scan results in the database and calls the `scanService` to perform a new analysis if needed.
*   **`teamController.js`**: (Empty) Placeholder for logic related to team management.
*   **`webhookController.js`**: Handles incoming webhook events from GitHub. It verifies the event type (e.g., `pull_request`) and triggers asynchronous background tasks, like the AI code review process.

#### `server/middleware/`

Express middleware functions used to process requests.

*   **`authMiddleware.js`**: A middleware that checks for a valid user session to protect authenticated routes.
*   **`errorMiddleware.js`**: A global error handler that catches and formats errors from anywhere in the application, ensuring a consistent error response.
*   **`verifySignature.js`**: A critical security middleware that verifies the cryptographic signature of incoming GitHub webhooks to ensure they are legitimate and have not been tampered with.

#### `server/models/`

Defines the data schemas for the MongoDB database using Mongoose.

*   **`Scan.js`**: Defines the schema for a `Scan` document. This is a detailed model that stores the entire result of a code analysis, including a summary, the commit SHA, and an array of `FileAnalysis` sub-documents, which in turn contain an array of `Issue` sub-documents.
*   **`Contributor.js`, `Issue.js`, `PullRequest.js`, `Repository.js`, `User.js`**: (Empty) These are placeholder files for Mongoose models that would store data related to contributors, issues, PRs, repositories, and users, respectively.

#### `server/routes/`

Defines the API endpoint routes and maps them to controller functions.

*   **`authRoutes.js`**: Defines routes for user authentication, such as `/login`, `/callback`, and `/logout`.
*   **`dashboardRoutes.js`, `teamRoutes.js`**: (Empty) Placeholder for future dashboard and team-related routes.
*   **`repoRoutes.js`**: Defines routes for fetching repository data, like `/api/repo/:owner/:repo/issues`.
*   **`scanRoutes.js`**: Defines routes for the scanning functionality, such as initiating a scan and retrieving scan history.
*   **`webhookRoutes.js`**: Defines the single `/github` endpoint that receives all webhook POST requests from the GitHub App.

#### `server/services/`

Contains logic for interacting with external services and complex, reusable business logic.

*   **`geminiService.js`**: A service that abstracts all interactions with the Google Gemini API. It handles constructing prompts, sending requests, and includes rate-limiting (`bottleneck`) to avoid exceeding API quotas.
*   **`githubAppService.js`**: Manages authentication for the GitHub App itself. Its primary role is to provide a properly authenticated Octokit instance for a given installation, which is necessary for the app to perform actions on a repository (e.g., post a PR comment).
*   **`githubService.js`**: A service containing helper functions to interact with the GitHub API on behalf of the logged-in user. It handles fetching repository trees, file content, and other general data.
*   **`scanService.js`**: The core service for code analysis. It filters files based on relevance, prepares prompts for the AI, calls the `geminiService`, and then parses, validates, and sanitizes the JSON response before saving the complete analysis to the database via the `Scan` model.

#### `server/utils/`

Contains utility functions and helpers for the backend.

*   **`crypto.js`**: Provides functions for encrypting and decrypting data, likely used to secure sensitive information stored in the user's session.
*   **`errorHandler.js`**: Defines a custom `AppError` class for creating structured, operational errors that can be handled gracefully by the global error middleware.
*   **`logger.js`**: (Empty) A placeholder for a future structured logging service (e.g., using Winston or Pino).