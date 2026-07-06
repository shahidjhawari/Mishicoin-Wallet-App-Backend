const express = require("express");
const User = require("../models/User");
const { protect } = require("../middleware/auth");
const {
  REFERRAL_LEVEL_1_BONUS,
  REFERRAL_LEVEL_2_BONUS,
  REFERRAL_LEVEL_3_BONUS,
} = require("../config/constants");

const router = express.Router();

// -----------------------------
// GET /api/referral/my-info
// Everything the "Invite Friends" screen needs in one call, including a
// 3-level-deep breakdown of the referral tree.
// -----------------------------
router.get("/my-info", protect, async (req, res) => {
  try {
    // Level 1: people who signed up directly with this user's code
    const level1Users = await User.find({ referredBy: req.user._id })
      .select("username nameOnCnic createdAt")
      .sort({ createdAt: -1 });
    const level1Ids = level1Users.map((u) => u._id);

    // Level 2: people referred by this user's level-1 referrals
    const level2Users = level1Ids.length
      ? await User.find({ referredBy: { $in: level1Ids } }).select("username nameOnCnic createdAt")
      : [];
    const level2Ids = level2Users.map((u) => u._id);

    // Level 3: people referred by this user's level-2 referrals
    const level3Users = level2Ids.length
      ? await User.find({ referredBy: { $in: level2Ids } }).select("username nameOnCnic createdAt")
      : [];

    return res.status(200).json({
      referralCode: req.user.referralCode,
      referralLink: `${process.env.APP_SHARE_BASE_URL || "https://mishicoin.app/r"}/${req.user.referralCode}`,
      bonusPerLevel: {
        level1: REFERRAL_LEVEL_1_BONUS,
        level2: REFERRAL_LEVEL_2_BONUS,
        level3: REFERRAL_LEVEL_3_BONUS,
      },
      totalReferred: level1Users.length + level2Users.length + level3Users.length,
      referralEarnings: req.user.referralEarnings,
      levels: {
        level1: { count: level1Users.length, users: level1Users },
        level2: { count: level2Users.length, users: level2Users },
        level3: { count: level3Users.length, users: level3Users },
      },
    });
  } catch (error) {
    console.error("Referral info error:", error);
    return res.status(500).json({ message: "Server error while fetching referral info" });
  }
});

module.exports = router;
