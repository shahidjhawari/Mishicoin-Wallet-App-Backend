const express = require("express");
const User = require("../models/User");
const { protect } = require("../middleware/auth");
const { REFERRAL_SIGNUP_BONUS } = require("../config/constants");

const router = express.Router();

// -----------------------------
// GET /api/referral/my-info
// Everything the "Invite Friends" screen needs in one call.
// -----------------------------
router.get("/my-info", protect, async (req, res) => {
  try {
    const referredUsers = await User.find({ referredBy: req.user._id })
      .select("username nameOnCnic createdAt")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      referralCode: req.user.referralCode,
      referralLink: `${process.env.APP_SHARE_BASE_URL || "https://mishicoin.app/r"}/${req.user.referralCode}`,
      bonusPerReferral: REFERRAL_SIGNUP_BONUS,
      totalReferred: referredUsers.length,
      referralEarnings: req.user.referralEarnings,
      referredUsers,
    });
  } catch (error) {
    console.error("Referral info error:", error);
    return res.status(500).json({ message: "Server error while fetching referral info" });
  }
});

module.exports = router;
