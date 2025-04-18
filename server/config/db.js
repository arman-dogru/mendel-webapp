// config/db.js
const mongoose = require('mongoose');
const { MONGODB_URI } = require('./env'); // Assuming MONGODB_URI is in your env config

const connectDB = async () => {
    if (!MONGODB_URI) {
        console.error('FATAL ERROR: MONGODB_URI is not defined in environment variables.');
        process.exit(1); // Exit process with failure
    }
    try {
        await mongoose.connect(MONGODB_URI, {
            // useNewUrlParser: true, // No longer needed in Mongoose 6+
            // useUnifiedTopology: true, // No longer needed in Mongoose 6+
            // useCreateIndex: true, // No longer supported
            // useFindAndModify: false, // No longer supported
        });
        console.log('MongoDB Connected Successfully');
    } catch (err) {
        console.error('MongoDB Connection Error:', err.message);
        // Exit process with failure
        process.exit(1);
    }
};

module.exports = connectDB;