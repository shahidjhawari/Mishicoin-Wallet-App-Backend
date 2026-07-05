const express = require("express");
const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

// All admin routes require a valid JWT AND role === "admin"
router.use(protect, adminOnly);

// -----------------------------
// GET /api/admin/pending-deposits
// -----------------------------
router.get("/pending-deposits", async (req, res) => {
  try {
    const deposits = await Transaction.find({ status: "Pending" })
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({ deposits });
  } catch (error) {
    console.error("Fetch pending deposits error:", error);
    return res.status(500).json({ message: "Server error while fetching deposits" });
  }
});

// -----------------------------
// GET /api/admin/all-deposits (optional helper, all statuses)
// -----------------------------
router.get("/all-deposits", async (req, res) => {
  try {
    const deposits = await Transaction.find({})
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({ deposits });
  } catch (error) {
    console.error("Fetch all deposits error:", error);
    return res.status(500).json({ message: "Server error while fetching deposits" });
  }
});

// -----------------------------
// PUT /api/admin/approve-deposit/:id
// Approves a deposit and credits the amount to the user's wallet.
// Uses a transaction session so the balance update and status update
// stay consistent even if something fails midway.
// -----------------------------
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

// -----------------------------
// PUT /api/admin/reject-deposit/:id
// -----------------------------
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

module.exports = router;
