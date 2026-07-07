const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { protect } = require("../middleware/auth");
const uploadProfile = require("../middleware/uploadProfile");
const sanitizeUser = require("../utils/sanitizeUser");

const router = express.Router();

// -----------------------------
// GET /api/user/me
// Returns the latest profile — call this after a deposit gets approved,
// a mining session is claimed, etc, to refresh the wallet balance and
// profile shown in the app.
// -----------------------------
router.get("/me", protect, async (req, res) => {
  return res.status(200).json({ user: sanitizeUser(req.user) });
});

// -----------------------------
// PUT /api/user/profile
// Body: any subset of { nameOnCnic, username, email, mobileNumber, cityOnCnic }
// Lets the user update their own profile details.
// -----------------------------
router.put("/profile", protect, async (req, res) => {
  try {
    const { nameOnCnic, username, email, mobileNumber, cityOnCnic } = req.body;
    const user = req.user;

    // If changing username/email, make sure the new value isn't already taken
    if (username && username.toLowerCase().trim() !== user.username) {
      const normalizedUsername = username.toLowerCase().trim();
      const existing = await User.findOne({ username: normalizedUsername });
      if (existing) {
        return res.status(409).json({ message: "Username is already taken" });
      }
      user.username = normalizedUsername;
    }

    if (email && email.toLowerCase().trim() !== user.email) {
      const normalizedEmail = email.toLowerCase().trim();
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        return res.status(409).json({ message: "Email is already registered" });
      }
      user.email = normalizedEmail;
    }

    if (nameOnCnic) user.nameOnCnic = nameOnCnic;
    if (mobileNumber) user.mobileNumber = mobileNumber;
    if (cityOnCnic) user.cityOnCnic = cityOnCnic;

    await user.save();

    return res.status(200).json({
      message: "Profile updated",
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ message: "Server error while updating profile" });
  }
});

// -----------------------------
// PUT /api/user/change-password
// Body: { currentPassword, newPassword }
// Kept separate from /profile for security (requires proof of current password).
// -----------------------------
router.put("/change-password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "currentPassword and newPassword are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.user._id).select("+password");

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ message: "Server error while changing password" });
  }
});

// -----------------------------
// POST /api/user/profile-picture
// Multipart form-data, file field name: profileImage
// -----------------------------
router.post(
  "/profile-picture",
  protect,
  uploadProfile.single("profileImage"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "profileImage file is required" });
      }

      const user = req.user;
      user.profileImageUrl = req.file.path; // Cloudinary secure_url
      await user.save();

      return res.status(200).json({
        message: "Profile picture updated",
        profileImageUrl: user.profileImageUrl,
        user: sanitizeUser(user),
      });
    } catch (error) {
      console.error("Profile picture upload error:", error);
      return res.status(500).json({ message: "Server error while uploading profile picture" });
    }
  }
);

module.exports = router;
