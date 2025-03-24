const express = require("express");
const authRoutes = require("./routes/authRoutes");
const errorHandler = require("./middleware/errorMiddleware");
const { Cookie } = require("express-session");
const cors = require("cors");
const session = require("express-session");
const { FRONTEND_URL, SESSION_SECRET, PORT } = require("./config/env");

const app = express();

// Enable CORS for frontend
app.use(
  cors({
    origin: FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(
  session({
    secret: SESSION_SECRET || "Your_secret_token",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use("/api/auth", authRoutes);

app.use(errorHandler);

const port = PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on port ${PORT}`);
});
