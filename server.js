require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const depositRoutes = require("./routes/depositRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

// -----------------------------
// Core middleware
// -----------------------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded screenshots statically so the Admin Panel / Android app
// can load them directly, e.g. http://localhost:5000/uploads/xxx.jpg
app.use("/uploads", express.static(path.join(__dirname, process.env.UPLOAD_DIR || "uploads")));

// -----------------------------
// Routes
// -----------------------------
app.use("/api/auth", authRoutes);
app.use("/api/deposit", depositRoutes);
app.use("/api/admin", adminRoutes);

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
