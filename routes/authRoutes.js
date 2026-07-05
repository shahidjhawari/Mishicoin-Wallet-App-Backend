const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper to sign a JWT for a given user id
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  });
};

// Shape a consistent user object to send back to clients
const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  walletBalance: user.walletBalance,
  status: user.status,
  role: user.role,
});

// -----------------------------
// POST /api/auth/signup
// -----------------------------
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    const token = generateToken(user._id);

    return res.status(201).json({
      message: "Signup successful",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ message: "Server error during signup" });
  }
});

// -----------------------------
// POST /api/auth/login
// -----------------------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user || !user.password) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.status === "blocked") {
      return res.status(403).json({ message: "Your account has been blocked" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Server error during login" });
  }
});

// -----------------------------
// POST /api/auth/google
// Body: { idToken: "<Google ID token from Android/Web client>" }
// -----------------------------
router.post("/google", async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: "idToken is required" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;

    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      user = await User.create({
        name,
        email: email.toLowerCase(),
        googleId,
      });
    } else if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }

    if (user.status === "blocked") {
      return res.status(403).json({ message: "Your account has been blocked" });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      message: "Google sign-in successful",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Google auth error:", error);
    return res.status(401).json({ message: "Invalid Google token" });
  }
});

module.exports = router;
