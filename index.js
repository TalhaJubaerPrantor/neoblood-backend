const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const serverless = require("serverless-http");

const userRoutes = require("./Routes/userRoute");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.send("🚀 Express + MongoDB running on Vercel!");
});

app.use("/users", userRoutes);
app.use("/register", userRoutes);
app.use("/login", userRoutes);

// MongoDB connection (use cloud DB like MongoDB Atlas)
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/neoblood", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err)); 

// ❌ Remove app.listen()
// ✅ Export for Vercel serverless
module.exports = app;
module.exports.handler = serverless(app);
 