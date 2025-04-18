// server.js
const express = require("express");
const authRoutes = require("./routes/authRoutes");
const reposRoutes = require("./routes/repoRoutes");
const scanRoutes = require("./routes/scanRoutes");
const errorHandler = require("./middleware/errorMiddleware");
const cors = require("cors");
const session = require("express-session");
const { FRONTEND_URL, SESSION_SECRET, PORT } = require("./config/env");
const connectDB = require('./config/db'); // <-- *** ADD THIS LINE ***

// Connect to Database
connectDB(); // <-- Now this function is defined

const app = express();

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
       secure: false, // Set to true when we will use HTTPS
       httpOnly: true,
       maxAge: 24 * 60 * 60 * 1000, // 1 day
     },
   })
 );


app.use(express.json()); // Add body parser for POST requests

app.use("/api/auth", authRoutes);
app.use("/api/repos", reposRoutes);
app.use("/api/scan", scanRoutes);

app.use(errorHandler); // Error handler should be last

const port = PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`); // Use port variable
});