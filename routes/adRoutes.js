const express = require("express");
const { protect } = require("../middleware/auth");
const { getSettings } = require("../services/settingsService");
const Earning = require("../models/Earning");

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
    const settings = await getSettings();
    const today = todayKey();

    if (user.lastAdWatchDate !== today) {
      user.adsWatchedToday = 0;
      user.lastAdWatchDate = today;
    }

    if (user.adsWatchedToday >= settings.adDailyLimit) {
      return res.status(400).json({
        message: `Daily ad limit reached (${settings.adDailyLimit}/day). Come back tomorrow.`,
        adsWatchedToday: user.adsWatchedToday,
        dailyLimit: settings.adDailyLimit,
      });
    }

    user.adsWatchedToday += 1;
    user.walletBalance += settings.adRewardAmount;
    await user.save();

    await Earning.create({
      user: user._id,
      type: "AdReward",
      amount: settings.adRewardAmount,
      description: "Watched a rewarded ad",
      balanceAfter: user.walletBalance,
    });

    return res.status(200).json({
      message: "Reward credited",
      reward: settings.adRewardAmount,
      adsWatchedToday: user.adsWatchedToday,
      dailyLimit: settings.adDailyLimit,
      walletBalance: user.walletBalance,
    });
  } catch (error) {
    console.error("Watch ad error:", error);
    return res.status(500).json({ message: "Server error while crediting ad reward" });
  }
});

// -----------------------------
// GET /api/ads/status
// -----------------------------
router.get("/status", protect, async (req, res) => {
  try {
    const user = req.user;
    const settings = await getSettings();
    const today = todayKey();
    const adsWatchedToday = user.lastAdWatchDate === today ? user.adsWatchedToday : 0;

    return res.status(200).json({
      adsWatchedToday,
      dailyLimit: settings.adDailyLimit,
      rewardPerAd: settings.adRewardAmount,
      remainingToday: Math.max(0, settings.adDailyLimit - adsWatchedToday),
    });
  } catch (error) {
    console.error("Ad status error:", error);
    return res.status(500).json({ message: "Server error while fetching ad status" });
  }
});

module.exports = router;
