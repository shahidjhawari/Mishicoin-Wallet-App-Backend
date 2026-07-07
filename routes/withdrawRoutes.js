const express = require("express");
const Withdrawal = require("../models/Withdrawal");
const { protect } = require("../middleware/auth");
const { getSettings } = require("../services/settingsService");

const router = express.Router();

// -----------------------------
// POST /api/withdraw
// Body: { amount, account_name, account_number, payment_method }
// The requested amount is deducted from the wallet immediately (reserved),
// so a user can't request more than their balance twice over while a
// request is still pending. If the admin rejects it, the amount is refunded.
// -----------------------------
router.post("/", protect, async (req, res) => {
  try {
    const { amount, account_name, account_number, payment_method } = req.body;
    const user = req.user;

    if (!amount || !account_name || !account_number || !payment_method) {
      return res.status(400).json({
        message: "amount, account_name, account_number and payment_method are required",
      });
    }

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({ message: "amount must be a positive number" });
    }

    const settings = await getSettings();

    if (numericAmount < settings.minWithdrawalAmount) {
      return res.status(400).json({
        message: `Minimum withdrawal amount is ${settings.minWithdrawalAmount} coins`,
        minWithdrawalAmount: settings.minWithdrawalAmount,
      });
    }

    if (numericAmount > user.walletBalance) {
      return res.status(400).json({ message: "Insufficient wallet balance" });
    }

    // Reserve the funds now so they can't be double-spent while pending
    user.walletBalance -= numericAmount;
    await user.save();

    const withdrawal = await Withdrawal.create({
      user: user._id,
      amount: numericAmount,
      accountName: account_name,
      accountNumber: account_number,
      paymentMethod: payment_method,
      status: "Pending",
    });

    return res.status(201).json({
      message: "Withdrawal request submitted, pending admin approval",
      withdrawal,
      walletBalance: user.walletBalance,
    });
  } catch (error) {
    console.error("Withdrawal request error:", error);
    return res.status(500).json({ message: "Server error while submitting withdrawal request" });
  }
});

// -----------------------------
// GET /api/withdraw/my-history
// -----------------------------
router.get("/my-history", protect, async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ user: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({ withdrawals });
  } catch (error) {
    console.error("Fetch withdrawal history error:", error);
    return res.status(500).json({ message: "Server error while fetching withdrawal history" });
  }
});

// -----------------------------
// GET /api/withdraw/min-amount
// Lets the app show "minimum withdrawal: X coins" before the user opens the form.
// -----------------------------
router.get("/min-amount", protect, async (req, res) => {
  try {
    const settings = await getSettings();
    return res.status(200).json({ minWithdrawalAmount: settings.minWithdrawalAmount });
  } catch (error) {
    console.error("Fetch min withdrawal error:", error);
    return res.status(500).json({ message: "Server error while fetching minimum withdrawal amount" });
  }
});

module.exports = router;
