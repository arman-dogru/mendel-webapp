const express = require("express");
const authRoutes = require("./routes/authRoutes");

const app = express();
app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
