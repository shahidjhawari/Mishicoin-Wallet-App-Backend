require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const depositRoutes = require("./routes/depositRoutes");
const withdrawRoutes = require("./routes/withdrawRoutes");
const adminRoutes = require("./routes/adminRoutes");
const miningRoutes = require("./routes/miningRoutes");
const adRoutes = require("./routes/adRoutes");
const referralRoutes = require("./routes/referralRoutes");

const app = express();

// -----------------------------
// Core middleware
// -----------------------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Deposit screenshots are hosted on Cloudinary now, so no local static
// file serving is needed — screenshotUrl in the API response is already
// a full, ready-to-use Cloudinary URL.

// -----------------------------
// Routes
// -----------------------------
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/deposit", depositRoutes);
app.use("/api/withdraw", withdrawRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/mining", miningRoutes);
app.use("/api/ads", adRoutes);
app.use("/api/referral", referralRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Mishicoin API is running" });
});

// -----------------------------
// 404 handler
// -----------------------------
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// -----------------------------
// Global error handler (e.g. Multer file errors)
// -----------------------------
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Something went wrong" });
});

// -----------------------------
// Start server
// -----------------------------
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Mishicoin backend running on port ${PORT}`);
  });
});
