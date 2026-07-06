const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { generateUniqueReferralCode } = require("../utils/referralCode");
const { REFERRAL_LEVEL_1_BONUS, REFERRAL_LEVEL_2_BONUS, REFERRAL_LEVEL_3_BONUS } = require("../config/constants");

const router = express.Router();

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  });
};

// Shape a consistent user object to send back to clients
const sanitizeUser = (user) => ({
  id: user._id,
  nameOnCnic: user.nameOnCnic,
  cityOnCnic: user.cityOnCnic,
  username: user.username,
  email: user.email,
  mobileNumber: user.mobileNumber,
  walletBalance: user.walletBalance,
  status: user.status,
  role: user.role,
  isMining: user.isMining,
  miningStartedAt: user.miningStartedAt,
  totalMined: user.totalMined,
  referralCode: user.referralCode,
  referralEarnings: user.referralEarnings,
});

// -----------------------------
// POST /api/auth/signup
// Body: { nameOnCnic, username, email, mobileNumber, cityOnCnic, password, referralCode? }
// -----------------------------
router.post("/signup", async (req, res) => {
  try {
    const {
      nameOnCnic,
      username,
      email,
      mobileNumber,
      cityOnCnic,
      password,
      referralCode, // optional: another user's referral code entered at signup
    } = req.body;

    if (!nameOnCnic || !username || !email || !mobileNumber || !cityOnCnic || !password) {
      return res.status(400).json({
        message:
          "nameOnCnic, username, email, mobileNumber, cityOnCnic and password are all required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const normalizedUsername = username.toLowerCase().trim();
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({
      $or: [{ username: normalizedUsername }, { email: normalizedEmail }],
    });

    if (existingUser) {
      const field = existingUser.username === normalizedUsername ? "Username" : "Email";
      return res.status(409).json({ message: `${field} is already taken` });
    }

    // Resolve an optional referrer from the referral code they entered
    let referrer = null;
    if (referralCode) {
      referrer = await User.findOne({ referralCode: referralCode.toUpperCase().trim() });
      if (!referrer) {
        return res.status(400).json({ message: "Invalid referral code" });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newReferralCode = await generateUniqueReferralCode();

    const user = await User.create({
      nameOnCnic,
      username: normalizedUsername,
      email: normalizedEmail,
      mobileNumber,
      cityOnCnic,
      password: hashedPassword,
      referralCode: newReferralCode,
      referredBy: referrer ? referrer._id : null,
    });

    // Reward up to 3 levels of the referral chain immediately on signup:
    // Level 1 = the person whose code was used
    // Level 2 = that person's own referrer
    // Level 3 = that person's referrer's referrer
    if (referrer) {
      referrer.walletBalance += REFERRAL_LEVEL_1_BONUS;
      referrer.referralEarnings += REFERRAL_LEVEL_1_BONUS;
      await referrer.save();

      if (referrer.referredBy) {
        const level2User = await User.findById(referrer.referredBy);
        if (level2User) {
          level2User.walletBalance += REFERRAL_LEVEL_2_BONUS;
          level2User.referralEarnings += REFERRAL_LEVEL_2_BONUS;
          await level2User.save();

          if (level2User.referredBy) {
            const level3User = await User.findById(level2User.referredBy);
            if (level3User) {
              level3User.walletBalance += REFERRAL_LEVEL_3_BONUS;
              level3User.referralEarnings += REFERRAL_LEVEL_3_BONUS;
              await level3User.save();
            }
          }
        }
      }
    }

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
// Body: { username, password }
// -----------------------------
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const user = await User.findOne({ username: username.toLowerCase().trim() }).select(
      "+password"
    );

    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    if (user.status === "blocked") {
      return res.status(403).json({ message: "Your account has been blocked" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid username or password" });
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

module.exports = router;
