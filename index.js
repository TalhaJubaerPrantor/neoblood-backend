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
let connectionPromise = null;

const connectDB = async () => {
  try {
    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      return;
    }

    // If connection is in progress, return the existing promise
    if (mongoose.connection.readyState === 2 && connectionPromise) {
      return connectionPromise;
    }

    // Create new connection promise
    if (!connectionPromise) {
      const mongoUri = process.env.MONGODB_URI ||
        "mongodb+srv://talhajubaer3121:7264@cluster0.ph4m3m0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
      
      connectionPromise = mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 3000, // Reduced to 3s for faster timeout
        socketTimeoutMS: 45000,
        connectTimeoutMS: 3000, // Connection timeout
        maxPoolSize: 1, // Limit connections for serverless
        minPoolSize: 0, // Allow connection pool to close
        bufferCommands: false, // Disable mongoose buffering
      }).then(() => {
        console.log("✅ Connected to MongoDB");
        connectionPromise = null; // Reset promise on success
        return;
      }).catch((err) => {
        connectionPromise = null; // Reset promise on error
        throw err;
      });
    }
    
    return connectionPromise;
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
    connectionPromise = null;
    throw err;
  }
};

// Middleware
app.use(cors());
app.use(express.json());

// Middleware to ensure MongoDB connection before handling requests (for serverless)
// Skip DB connection check for health endpoint
app.use(async (req, res, next) => {
  // Skip DB check for health endpoint
  if (req.path === '/api/health' || req.path === '/') {
    return next();
  }
  
  try {
    // Check if connected - fast path
    if (mongoose.connection.readyState === 1) {
      return next();
    }
    
    // Try to connect with timeout
    const connectWithTimeout = Promise.race([
      connectDB(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 2500)
      )
    ]);
    
    await connectWithTimeout;
    
    // Double-check connection state
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
  res.json({ 
    status: 200, 
    message: "🚀 Express + MongoDB running!",
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: 200, 
    message: "Server is healthy",
    dbStatus: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  });
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

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  res.status(err.status || 500).json({
    status: err.status || 500,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 404,
    message: "Route not found",
    path: req.path
  });
});

// Connect to MongoDB on startup (only for local development)
if (process.env.NODE_ENV !== "production") {
  connectDB().catch(console.error);
}

// Handle connection events
mongoose.connection.on('disconnected', () => {
  console.log("⚠️ MongoDB disconnected");
});

mongoose.connection.on('error', (err) => {
  console.error("❌ MongoDB connection error:", err);
});

// For local development
if (!process.env.VERCEL && process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`🚀 Local server running at http://localhost:${PORT}`);
  });
}

// Export serverless handler for Vercel (always export this for Vercel)
module.exports = serverless(app);
