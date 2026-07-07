const express = require("express");
const { protect } = require("../middleware/auth");
const { getSettings } = require("../services/settingsService");
const Earning = require("../models/Earning");

const router = express.Router();

// Computes how much of the current mining session has elapsed/earned,
// using whatever session length/rate is currently set in Settings.
const computeProgress = (miningStartedAt, sessionHours, ratePerHour) => {
  const sessionMs = sessionHours * 60 * 60 * 1000;
  const elapsedMs = Date.now() - new Date(miningStartedAt).getTime();
  const cappedMs = Math.min(elapsedMs, sessionMs);
  const elapsedHours = cappedMs / (60 * 60 * 1000);
  const earnedSoFar = Number((elapsedHours * ratePerHour).toFixed(4));
  const isComplete = elapsedMs >= sessionMs;
  const remainingMs = Math.max(0, sessionMs - elapsedMs);

  return {
    earnedSoFar,
    isComplete,
    remainingMs,
    progressPercent: Math.min(100, (elapsedMs / sessionMs) * 100),
  };
};

// -----------------------------
// POST /api/mining/start
// -----------------------------
router.post("/start", protect, async (req, res) => {
  try {
    const user = req.user;
    const settings = await getSettings();

    if (user.isMining) {
      const { isComplete } = computeProgress(
        user.miningStartedAt,
        settings.miningSessionHours,
        settings.miningRatePerHour
      );
      if (!isComplete) {
        return res.status(400).json({
          message: "A mining session is already in progress. Wait for it to complete.",
        });
      }
      return res.status(400).json({
        message: "Your last mining session is complete. Claim it before starting a new one.",
      });
    }

    user.isMining = true;
    user.miningStartedAt = new Date();
    await user.save();

    return res.status(200).json({
      message: "Mining started",
      miningStartedAt: user.miningStartedAt,
      sessionHours: settings.miningSessionHours,
      ratePerHour: settings.miningRatePerHour,
      fullSessionReward: settings.miningSessionHours * settings.miningRatePerHour,
    });
  } catch (error) {
    console.error("Mining start error:", error);
    return res.status(500).json({ message: "Server error while starting mining" });
  }
});

// -----------------------------
// GET /api/mining/status
// -----------------------------
router.get("/status", protect, async (req, res) => {
  try {
    const user = req.user;
    const settings = await getSettings();

    if (!user.isMining) {
      return res.status(200).json({
        isMining: false,
        totalMined: user.totalMined,
        walletBalance: user.walletBalance,
        message: "Not currently mining. Start a session to earn coins.",
      });
    }

    const progress = computeProgress(
      user.miningStartedAt,
      settings.miningSessionHours,
      settings.miningRatePerHour
    );

    return res.status(200).json({
      isMining: true,
      miningStartedAt: user.miningStartedAt,
      sessionHours: settings.miningSessionHours,
      ratePerHour: settings.miningRatePerHour,
      fullSessionReward: settings.miningSessionHours * settings.miningRatePerHour,
      earnedSoFar: progress.earnedSoFar,
      progressPercent: Number(progress.progressPercent.toFixed(2)),
      remainingSeconds: Math.ceil(progress.remainingMs / 1000),
      isComplete: progress.isComplete,
      totalMined: user.totalMined,
      walletBalance: user.walletBalance,
    });
  } catch (error) {
    console.error("Mining status error:", error);
    return res.status(500).json({ message: "Server error while fetching mining status" });
  }
});

// -----------------------------
// POST /api/mining/claim
// -----------------------------
router.post("/claim", protect, async (req, res) => {
  try {
    const user = req.user;
    const settings = await getSettings();

    if (!user.isMining) {
      return res.status(400).json({ message: "No active mining session to claim" });
    }

    const progress = computeProgress(
      user.miningStartedAt,
      settings.miningSessionHours,
      settings.miningRatePerHour
    );

    if (!progress.isComplete) {
      return res.status(400).json({
        message: "Mining session is not complete yet",
        remainingSeconds: Math.ceil(progress.remainingMs / 1000),
      });
    }

    const reward = settings.miningSessionHours * settings.miningRatePerHour;

    user.walletBalance += reward;
    user.totalMined += reward;
    user.isMining = false;
    user.miningStartedAt = null;
    user.lastClaimedAt = new Date();
    await user.save();

    await Earning.create({
      user: user._id,
      type: "Mining",
      amount: reward,
      description: `Mining session reward (${settings.miningSessionHours}h @ $${settings.miningRatePerHour}/h)`,
      balanceAfter: user.walletBalance,
    });

    return res.status(200).json({
      message: "Mining reward claimed",
      reward,
      walletBalance: user.walletBalance,
      totalMined: user.totalMined,
    });
  } catch (error) {
    console.error("Mining claim error:", error);
    return res.status(500).json({ message: "Server error while claiming mining reward" });
  }
});

module.exports = router;
