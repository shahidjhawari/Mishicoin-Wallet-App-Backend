const express = require("express");
const Transaction = require("../models/Transaction");
const Withdrawal = require("../models/Withdrawal");
const Earning = require("../models/Earning");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Normalizes a deposit (Transaction), withdrawal, or earning document into
// one common shape so the app/admin panel can render a single combined list.
const mapDeposit = (t) => ({
  id: t._id,
  category: "Deposit",
  type: "Deposit",
  amount: t.amount, // positive — money coming in once approved
  status: t.status, // Pending | Approved | Rejected
  description: `Deposit via ${t.paymentMethod} (Txn ID: ${t.transactionId})`,
  date: t.createdAt,
  meta: {
    paymentMethod: t.paymentMethod,
    transactionId: t.transactionId,
    screenshotUrl: t.screenshotUrl,
  },
});

const mapWithdrawal = (w) => ({
  id: w._id,
  category: "Withdrawal",
  type: "Withdrawal",
  amount: -w.amount, // negative — money going out
  status: w.status, // Pending | Approved | Rejected
  description: `Withdrawal to ${w.paymentMethod} (${w.accountNumber})`,
  date: w.createdAt,
  meta: {
    paymentMethod: w.paymentMethod,
    accountName: w.accountName,
    accountNumber: w.accountNumber,
  },
});

const mapEarning = (e) => ({
  id: e._id,
  category: "Earning",
  type: e.type, // Mining | AdReward | ReferralBonus
  amount: e.amount, // always positive
  status: "Completed",
  description: e.description,
  date: e.createdAt,
  meta: {
    balanceAfter: e.balanceAfter,
  },
});

// -----------------------------
// GET /api/wallet/history
// Combined deposit + withdrawal + earning history for the logged-in user,
// newest first. This is the single endpoint the app needs for a
// "Transaction History" screen.
// -----------------------------
router.get("/history", protect, async (req, res) => {
  try {
    const userId = req.user._id;

    const [deposits, withdrawals, earnings] = await Promise.all([
      Transaction.find({ user: userId }).sort({ createdAt: -1 }),
      Withdrawal.find({ user: userId }).sort({ createdAt: -1 }),
      Earning.find({ user: userId }).sort({ createdAt: -1 }),
    ]);

    const combined = [
      ...deposits.map(mapDeposit),
      ...withdrawals.map(mapWithdrawal),
      ...earnings.map(mapEarning),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    return res.status(200).json({ transactions: combined });
  } catch (error) {
    console.error("Wallet history error:", error);
    return res.status(500).json({ message: "Server error while fetching wallet history" });
  }
});

module.exports = router;
