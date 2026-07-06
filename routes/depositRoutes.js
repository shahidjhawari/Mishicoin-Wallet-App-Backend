const express = require("express");
const Transaction = require("../models/Transaction");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

// -----------------------------
// POST /api/deposit
// Multipart form-data fields: amount, txn_id, mobile_number, payment_method
// File field name: screenshot
// -----------------------------
router.post("/", protect, upload.single("screenshot"), async (req, res) => {
  try {
    const { amount, txn_id, mobile_number, payment_method } = req.body;

    if (!amount || !txn_id || !mobile_number || !payment_method) {
      return res.status(400).json({
        message: "amount, txn_id, mobile_number and payment_method are required",
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Screenshot image file is required" });
    }

    // multer-storage-cloudinary puts the uploaded image's secure URL on
    // req.file.path, and the Cloudinary public_id on req.file.filename
    const screenshotUrl = req.file.path;
    const screenshotPublicId = req.file.filename;

    const transaction = await Transaction.create({
      user: req.user._id,
      amount: Number(amount),
      transactionId: txn_id,
      screenshotUrl,
      screenshotPublicId,
      mobileNumber: mobile_number,
      paymentMethod: payment_method,
      status: "Pending",
    });

    return res.status(201).json({
      message: "Deposit request submitted, pending admin approval",
      transaction,
    });
  } catch (error) {
    console.error("Deposit submission error:", error);
    return res.status(500).json({ message: "Server error while submitting deposit" });
  }
});

// -----------------------------
// GET /api/deposit/my-history
// Convenience endpoint for the mobile app to show a user's own deposits
// -----------------------------
router.get("/my-history", protect, async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user._id }).sort({
      createdAt: -1,
    });
    return res.status(200).json({ transactions });
  } catch (error) {
    console.error("Fetch history error:", error);
    return res.status(500).json({ message: "Server error while fetching history" });
  }
});

module.exports = router;
