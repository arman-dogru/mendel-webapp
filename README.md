```
/my-web-app
.
├── README.md
├── client
│   ├── README.md
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── public
│   │   ├── MENDEL_LAB_LOGO-nobackground.png
│   │   └── vite.svg
│   ├── src
│   │   ├── App.jsx
│   │   ├── assets
│   │   │   └── images
│   │   ├── components
│   │   │   ├── CodeAnalysis
│   │   │   │   └── CodeAnalysisComponent.jsx
│   │   │   ├── GitTree
│   │   │   │   ├── GitTreeComponent.css
│   │   │   │   └── GitTreeComponent.jsx
│   │   │   ├── HomePageNavbar
│   │   │   │   ├── HomePageNavbar.css
│   │   │   │   └── HomePageNavbar.jsx
│   │   │   ├── Issues
│   │   │   │   ├── IssuesComponent.jsx
│   │   │   │   └── issuesComponent.css
│   │   │   ├── LoginButton
│   │   │   │   ├── LoginButton.css
│   │   │   │   └── LoginButton.jsx
│   │   │   ├── Navbar
│   │   │   │   ├── Navbar.css
│   │   │   │   └── Navbar.jsx
│   │   │   ├── PRs
│   │   │   │   ├── PRs.css
│   │   │   │   └── PRs.jsx
│   │   │   ├── RepoCards
│   │   │   │   ├── RepoCards.css
│   │   │   │   └── RepoCards.jsx
│   │   │   └── Teams
│   │   │       ├── TeamComponents.css
│   │   │       └── TeamsComponents.jsx
│   │   ├── context
│   │   │   └── RepoContext.jsx
│   │   ├── data
│   │   │   └── gittree.json
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
    │   └── teamController.js
    ├── middleware
    │   ├── authMiddleware.js
    │   └── errorMiddleware.js
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
    │   └── teamRoutes.js
    ├── server.js
    ├── services
    │   ├── geminiService.js
    │   ├── githubService.js
    │   └── scanService.js
    └── utils
        ├── crypto.js
        ├── errorHandler.js
        └── logger.js
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