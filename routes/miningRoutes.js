const express = require("express");
const { protect } = require("../middleware/auth");
const { MINING_SESSION_HOURS, MINING_RATE_PER_HOUR } = require("../config/constants");

const router = express.Router();

const SESSION_MS = MINING_SESSION_HOURS * 60 * 60 * 1000;
const FULL_SESSION_REWARD = MINING_SESSION_HOURS * MINING_RATE_PER_HOUR;

// Computes how much of the current mining session has elapsed/earned
const computeProgress = (miningStartedAt) => {
  const elapsedMs = Date.now() - new Date(miningStartedAt).getTime();
  const cappedMs = Math.min(elapsedMs, SESSION_MS);
  const elapsedHours = cappedMs / (60 * 60 * 1000);
  const earnedSoFar = Number((elapsedHours * MINING_RATE_PER_HOUR).toFixed(4));
  const isComplete = elapsedMs >= SESSION_MS;
  const remainingMs = Math.max(0, SESSION_MS - elapsedMs);

  return { earnedSoFar, isComplete, remainingMs, progressPercent: Math.min(100, (elapsedMs / SESSION_MS) * 100) };
};

// -----------------------------
// POST /api/mining/start
// Starts a new mining session for the logged-in user.
// -----------------------------
router.post("/start", protect, async (req, res) => {
  try {
    const user = req.user;

    if (user.isMining) {
      const { isComplete } = computeProgress(user.miningStartedAt);
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
      sessionHours: MINING_SESSION_HOURS,
      ratePerHour: MINING_RATE_PER_HOUR,
      fullSessionReward: FULL_SESSION_REWARD,
    });
  } catch (error) {
    console.error("Mining start error:", error);
    return res.status(500).json({ message: "Server error while starting mining" });
  }
});

// -----------------------------
// GET /api/mining/status
// Returns the current session's progress without changing anything.
// -----------------------------
router.get("/status", protect, async (req, res) => {
  try {
    const user = req.user;

    if (!user.isMining) {
      return res.status(200).json({
        isMining: false,
        totalMined: user.totalMined,
        walletBalance: user.walletBalance,
        message: "Not currently mining. Start a session to earn coins.",
      });
    }

    const progress = computeProgress(user.miningStartedAt);

    return res.status(200).json({
      isMining: true,
      miningStartedAt: user.miningStartedAt,
      sessionHours: MINING_SESSION_HOURS,
      ratePerHour: MINING_RATE_PER_HOUR,
      fullSessionReward: FULL_SESSION_REWARD,
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
// Credits the finished session's reward to the wallet and resets state.
// -----------------------------
router.post("/claim", protect, async (req, res) => {
  try {
    const user = req.user;

    if (!user.isMining) {
      return res.status(400).json({ message: "No active mining session to claim" });
    }

    const progress = computeProgress(user.miningStartedAt);

    if (!progress.isComplete) {
      return res.status(400).json({
        message: "Mining session is not complete yet",
        remainingSeconds: Math.ceil(progress.remainingMs / 1000),
      });
    }

    const reward = FULL_SESSION_REWARD;

    user.walletBalance += reward;
    user.totalMined += reward;
    user.isMining = false;
    user.miningStartedAt = null;
    user.lastClaimedAt = new Date();
    await user.save();

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
