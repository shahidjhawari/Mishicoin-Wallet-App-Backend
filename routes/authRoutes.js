const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Earning = require("../models/Earning");
const { generateUniqueReferralCode } = require("../utils/referralCode");
const { getSettings } = require("../services/settingsService");
const sanitizeUser = require("../utils/sanitizeUser");

const router = express.Router();

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  });
};


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
      const settings = await getSettings();

      referrer.walletBalance += settings.referralLevel1Bonus;
      referrer.referralEarnings += settings.referralLevel1Bonus;
      await referrer.save();
      await Earning.create({
        user: referrer._id,
        type: "ReferralBonus",
        amount: settings.referralLevel1Bonus,
        description: `Level 1 referral bonus — ${user.username} joined using your code`,
        balanceAfter: referrer.walletBalance,
      });

      if (referrer.referredBy) {
        const level2User = await User.findById(referrer.referredBy);
        if (level2User) {
          level2User.walletBalance += settings.referralLevel2Bonus;
          level2User.referralEarnings += settings.referralLevel2Bonus;
          await level2User.save();
          await Earning.create({
            user: level2User._id,
            type: "ReferralBonus",
            amount: settings.referralLevel2Bonus,
            description: `Level 2 referral bonus — ${user.username} joined via your network`,
            balanceAfter: level2User.walletBalance,
          });

          if (level2User.referredBy) {
            const level3User = await User.findById(level2User.referredBy);
            if (level3User) {
              level3User.walletBalance += settings.referralLevel3Bonus;
              level3User.referralEarnings += settings.referralLevel3Bonus;
              await level3User.save();
              await Earning.create({
                user: level3User._id,
                type: "ReferralBonus",
                amount: settings.referralLevel3Bonus,
                description: `Level 3 referral bonus — ${user.username} joined via your network`,
                balanceAfter: level3User.walletBalance,
              });
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
