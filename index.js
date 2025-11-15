const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const serverless = require("serverless-http");

const authRoutes = require("./Routes/authRoute");
const homeRoutes = require("./Routes/homeRoute");
const circleRoutes = require("./Routes/circleRoute");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

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

// MongoDB connection
mongoose
  .connect(
    process.env.MONGODB_URI ||
      "mongodb+srv://talhajubaer3121:7264@cluster0.ph4m3m0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
  )
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// For local development
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`🚀 Local server running at http://localhost:${PORT}`);
  });
}

// Export for Vercel
module.exports = app;
module.exports.handler = serverless(app);
