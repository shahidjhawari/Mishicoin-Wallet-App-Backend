const express = require("express");
const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const Withdrawal = require("../models/Withdrawal");
const Earning = require("../models/Earning");
const User = require("../models/User");
const { protect, adminOnly } = require("../middleware/auth");
const { getSettings, updateSettings } = require("../services/settingsService");

const router = express.Router();

// All admin routes require a valid JWT AND role === "admin"
router.use(protect, adminOnly);

// =====================================================
// DEPOSITS
// =====================================================

// GET /api/admin/pending-deposits
router.get("/pending-deposits", async (req, res) => {
  try {
    const deposits = await Transaction.find({ status: "Pending" })
      .populate("user", "username email nameOnCnic")
      .sort({ createdAt: -1 });

    return res.status(200).json({ deposits });
  } catch (error) {
    console.error("Fetch pending deposits error:", error);
    return res.status(500).json({ message: "Server error while fetching deposits" });
  }
});

// GET /api/admin/all-deposits (optional helper, all statuses)
router.get("/all-deposits", async (req, res) => {
  try {
    const deposits = await Transaction.find({})
      .populate("user", "username email nameOnCnic")
      .sort({ createdAt: -1 });

    return res.status(200).json({ deposits });
  } catch (error) {
    console.error("Fetch all deposits error:", error);
    return res.status(500).json({ message: "Server error while fetching deposits" });
  }
});

// PUT /api/admin/approve-deposit/:id
router.put("/approve-deposit/:id", async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const deposit = await Transaction.findById(req.params.id).session(session);

    if (!deposit) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Deposit not found" });
    }

    if (deposit.status !== "Pending") {
      await session.abortTransaction();
      return res.status(400).json({ message: `Deposit already ${deposit.status.toLowerCase()}` });
    }

    deposit.status = "Approved";
    deposit.reviewedBy = req.user._id;
    deposit.reviewedAt = new Date();
    await deposit.save({ session });

    await User.findByIdAndUpdate(
      deposit.user,
      { $inc: { walletBalance: deposit.amount } },
      { session }
    );

    await session.commitTransaction();

    return res.status(200).json({ message: "Deposit approved and wallet credited", deposit });
  } catch (error) {
    await session.abortTransaction();
    console.error("Approve deposit error:", error);
    return res.status(500).json({ message: "Server error while approving deposit" });
  } finally {
    session.endSession();
  }
});

// PUT /api/admin/reject-deposit/:id
router.put("/reject-deposit/:id", async (req, res) => {
  try {
    const deposit = await Transaction.findById(req.params.id);

    if (!deposit) {
      return res.status(404).json({ message: "Deposit not found" });
    }

    if (deposit.status !== "Pending") {
      return res.status(400).json({ message: `Deposit already ${deposit.status.toLowerCase()}` });
    }

    deposit.status = "Rejected";
    deposit.reviewedBy = req.user._id;
    deposit.reviewedAt = new Date();
    await deposit.save();

    return res.status(200).json({ message: "Deposit rejected", deposit });
  } catch (error) {
    console.error("Reject deposit error:", error);
    return res.status(500).json({ message: "Server error while rejecting deposit" });
  }
});

// =====================================================
// WITHDRAWALS
// =====================================================

// GET /api/admin/pending-withdrawals
router.get("/pending-withdrawals", async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ status: "Pending" })
      .populate("user", "username email nameOnCnic walletBalance")
      .sort({ createdAt: -1 });

    return res.status(200).json({ withdrawals });
  } catch (error) {
    console.error("Fetch pending withdrawals error:", error);
    return res.status(500).json({ message: "Server error while fetching withdrawals" });
  }
});

// GET /api/admin/all-withdrawals (optional helper, all statuses)
router.get("/all-withdrawals", async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({})
      .populate("user", "username email nameOnCnic")
      .sort({ createdAt: -1 });

    return res.status(200).json({ withdrawals });
  } catch (error) {
    console.error("Fetch all withdrawals error:", error);
    return res.status(500).json({ message: "Server error while fetching withdrawals" });
  }
});

// PUT /api/admin/approve-withdrawal/:id
// Funds were already deducted/reserved from the wallet when the user
// submitted the request, so approving just confirms the payout was sent —
// no balance change happens here.
router.put("/approve-withdrawal/:id", async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id);

    if (!withdrawal) {
      return res.status(404).json({ message: "Withdrawal not found" });
    }

    if (withdrawal.status !== "Pending") {
      return res.status(400).json({ message: `Withdrawal already ${withdrawal.status.toLowerCase()}` });
    }

    withdrawal.status = "Approved";
    withdrawal.reviewedBy = req.user._id;
    withdrawal.reviewedAt = new Date();
    await withdrawal.save();

    return res.status(200).json({ message: "Withdrawal approved", withdrawal });
  } catch (error) {
    console.error("Approve withdrawal error:", error);
    return res.status(500).json({ message: "Server error while approving withdrawal" });
  }
});

// PUT /api/admin/reject-withdrawal/:id
// Refunds the reserved amount back to the user's wallet.
router.put("/reject-withdrawal/:id", async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const withdrawal = await Withdrawal.findById(req.params.id).session(session);

    if (!withdrawal) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Withdrawal not found" });
    }

    if (withdrawal.status !== "Pending") {
      await session.abortTransaction();
      return res.status(400).json({ message: `Withdrawal already ${withdrawal.status.toLowerCase()}` });
    }

    withdrawal.status = "Rejected";
    withdrawal.reviewedBy = req.user._id;
    withdrawal.reviewedAt = new Date();
    await withdrawal.save({ session });

    await User.findByIdAndUpdate(
      withdrawal.user,
      { $inc: { walletBalance: withdrawal.amount } },
      { session }
    );

    await session.commitTransaction();

    return res.status(200).json({ message: "Withdrawal rejected and amount refunded", withdrawal });
  } catch (error) {
    await session.abortTransaction();
    console.error("Reject withdrawal error:", error);
    return res.status(500).json({ message: "Server error while rejecting withdrawal" });
  } finally {
    session.endSession();
  }
});

// =====================================================
// WALLET HISTORY (deposits + withdrawals + earnings combined)
// =====================================================

const mapDeposit = (t) => ({
  id: t._id,
  category: "Deposit",
  type: "Deposit",
  amount: t.amount,
  status: t.status,
  description: `Deposit via ${t.paymentMethod} (Txn ID: ${t.transactionId})`,
  date: t.createdAt,
  user: t.user,
});

const mapWithdrawal = (w) => ({
  id: w._id,
  category: "Withdrawal",
  type: "Withdrawal",
  amount: -w.amount,
  status: w.status,
  description: `Withdrawal to ${w.paymentMethod} (${w.accountNumber})`,
  date: w.createdAt,
  user: w.user,
});

const mapEarning = (e) => ({
  id: e._id,
  category: "Earning",
  type: e.type,
  amount: e.amount,
  status: "Completed",
  description: e.description,
  date: e.createdAt,
  user: e.user,
});

// GET /api/admin/wallet-history
// Optional query param: ?userId=<id> to see just one user's full history.
// Without it, returns every user's history (most recent first) — useful
// as an "all transactions" audit log.
router.get("/wallet-history", async (req, res) => {
  try {
    const { userId } = req.query;
    const filter = userId ? { user: userId } : {};

    const [deposits, withdrawals, earnings] = await Promise.all([
      Transaction.find(filter).populate("user", "username email nameOnCnic").sort({ createdAt: -1 }),
      Withdrawal.find(filter).populate("user", "username email nameOnCnic").sort({ createdAt: -1 }),
      Earning.find(filter).populate("user", "username email nameOnCnic").sort({ createdAt: -1 }),
    ]);

    const combined = [
      ...deposits.map(mapDeposit),
      ...withdrawals.map(mapWithdrawal),
      ...earnings.map(mapEarning),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    return res.status(200).json({ transactions: combined });
  } catch (error) {
    console.error("Admin wallet history error:", error);
    return res.status(500).json({ message: "Server error while fetching wallet history" });
  }
});

// =====================================================
// SETTINGS (earning economy — mining / ads / referral / withdrawals)
// =====================================================

// GET /api/admin/settings
router.get("/settings", async (req, res) => {
  try {
    const settings = await getSettings();
    return res.status(200).json({ settings });
  } catch (error) {
    console.error("Fetch settings error:", error);
    return res.status(500).json({ message: "Server error while fetching settings" });
  }
});

// PUT /api/admin/settings
// Body: any subset of { miningSessionHours, miningRatePerHour, adRewardAmount,
// adDailyLimit, referralLevel1Bonus, referralLevel2Bonus, referralLevel3Bonus,
// minWithdrawalAmount }
router.put("/settings", async (req, res) => {
  try {
    const settings = await updateSettings(req.body);
    return res.status(200).json({ message: "Settings updated", settings });
  } catch (error) {
    console.error("Update settings error:", error);
    return res.status(500).json({ message: "Server error while updating settings" });
  }
});

module.exports = router;
