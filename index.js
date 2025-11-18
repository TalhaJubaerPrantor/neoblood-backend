const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const serverless = require("serverless-http");

const authRoutes = require("./Routes/authRoute");
const homeRoutes = require("./Routes/homeRoute");
const circleRoutes = require("./Routes/circleRoute");
const findRoutes = require("./Routes/findRoute");

const app = express();

// MongoDB connection helper for serverless
const connectDB = async () => {
  try {
    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      console.log("✅ MongoDB already connected");
      return;
    }

    // Check if connection is in progress
    if (mongoose.connection.readyState === 2) {
      console.log("⏳ MongoDB connection in progress...");
      return;
    }

    // Connect with serverless-optimized options
    const mongoUri = process.env.MONGODB_URI ||
      "mongodb+srv://talhajubaer3121:7264@cluster0.ph4m3m0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      bufferCommands: false, // Disable mongoose buffering
    });
    
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
    throw err;
  }
};

// Middleware
app.use(cors());
app.use(express.json());

// Middleware to ensure MongoDB connection before handling requests (for serverless)
app.use(async (req, res, next) => {
  try {
    // Check if connected
    if (mongoose.connection.readyState === 1) {
      return next();
    }
    
    // If not connected, try to connect
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }
    
    // If connection is in progress, wait a bit
    if (mongoose.connection.readyState === 2) {
      // Wait for connection (max 5 seconds)
      let attempts = 0;
      while (mongoose.connection.readyState !== 1 && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
    }
    
    // If still not connected, return error
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).send({
        status: 503,
        message: "Database connection unavailable. Please try again."
      });
    }
    
    next();
  } catch (error) {
    console.error("Database connection middleware error:", error);
    return res.status(503).send({
      status: 503,
      message: "Database connection error. Please try again."
    });
  }
});

// Routes
app.get("/", (req, res) => {
  res.send("🚀 Express + MongoDB running!");
});

// Auth Routes
app.get("/users", authRoutes);
app.post("/register", authRoutes);
app.post("/login", authRoutes);

// Home/Donation Routes
app.get("/blood-requests", homeRoutes);
app.post("/accept-request", homeRoutes);
app.get("/donation-history/:userId", homeRoutes);
app.get("/available-donors", homeRoutes);
app.get("/my-blood-requests/:userId", homeRoutes);
app.post("/create-blood-request", homeRoutes);
app.delete("/delete-blood-request", homeRoutes);

// Connection Request Routes
app.post("/send-request-to-donor", homeRoutes);
app.get("/connection-requests/:userId", homeRoutes);
app.post("/accept-connection-request", homeRoutes);
app.post("/reject-connection-request", homeRoutes);
app.get("/eligibility-status/:userId", homeRoutes);

// Circle Routes
app.get("/users/:userId", circleRoutes);
app.post("/search-user-by-phone", circleRoutes);
app.post("/add-to-circle", circleRoutes);
app.post("/remove-from-circle", circleRoutes);

// Find/Location Routes
app.post("/update-user-location", findRoutes);
app.get("/users-with-location", findRoutes);

// Connect to MongoDB on startup
connectDB().catch(console.error);

// Handle connection events
mongoose.connection.on('disconnected', () => {
  console.log("⚠️ MongoDB disconnected");
});

mongoose.connection.on('error', (err) => {
  console.error("❌ MongoDB connection error:", err);
});

// For local development
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`🚀 Local server running at http://localhost:${PORT}`);
  });
  // Export app for local development
  module.exports = app;
} else {
  // Export serverless handler for Vercel
  module.exports = serverless(app);
}
