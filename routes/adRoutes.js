const express = require("express");
const { protect } = require("../middleware/auth");
const { AD_REWARD_AMOUNT, AD_DAILY_LIMIT } = require("../config/constants");

const router = express.Router();

// Returns today's date as YYYY-MM-DD (server local time) for daily-limit resets
const todayKey = () => new Date().toISOString().slice(0, 10);

// -----------------------------
// POST /api/ads/watch
// Called by the app after a rewarded ad finishes playing.
// -----------------------------
router.post("/watch", protect, async (req, res) => {
  try {
    const user = req.user;
    const today = todayKey();

    // Reset the daily counter if this is the first ad watched today
    if (user.lastAdWatchDate !== today) {
      user.adsWatchedToday = 0;
      user.lastAdWatchDate = today;
    }

    if (user.adsWatchedToday >= AD_DAILY_LIMIT) {
      return res.status(400).json({
        message: `Daily ad limit reached (${AD_DAILY_LIMIT}/day). Come back tomorrow.`,
        adsWatchedToday: user.adsWatchedToday,
        dailyLimit: AD_DAILY_LIMIT,
      });
    }

    user.adsWatchedToday += 1;
    user.walletBalance += AD_REWARD_AMOUNT;
    await user.save();

    return res.status(200).json({
      message: "Reward credited",
      reward: AD_REWARD_AMOUNT,
      adsWatchedToday: user.adsWatchedToday,
      dailyLimit: AD_DAILY_LIMIT,
      walletBalance: user.walletBalance,
    });
  } catch (error) {
    console.error("Watch ad error:", error);
    return res.status(500).json({ message: "Server error while crediting ad reward" });
  }
});

// -----------------------------
// GET /api/ads/status
// Lets the app show "x/20 ads watched today" before the user taps watch.
// -----------------------------
router.get("/status", protect, async (req, res) => {
  try {
    const user = req.user;
    const today = todayKey();
    const adsWatchedToday = user.lastAdWatchDate === today ? user.adsWatchedToday : 0;

    return res.status(200).json({
      adsWatchedToday,
      dailyLimit: AD_DAILY_LIMIT,
      rewardPerAd: AD_REWARD_AMOUNT,
      remainingToday: Math.max(0, AD_DAILY_LIMIT - adsWatchedToday),
    });
  } catch (error) {
    console.error("Ad status error:", error);
    return res.status(500).json({ message: "Server error while fetching ad status" });
  }
});

module.exports = router;
