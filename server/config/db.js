const mongoose = require("mongoose");
const { MONGODB_URI } = require("./env");

const connectDB = async () => {
  if (!MONGODB_URI) {
    console.error(
      "FATAL ERROR: MONGODB_URI is not defined in environment variables."
    );
    process.exit(1);
  }
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB Connected Successfully");
  } catch (err) {
    console.error("MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
