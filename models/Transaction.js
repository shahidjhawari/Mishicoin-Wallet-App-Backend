const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [1, "Amount must be greater than 0"],
    },
    transactionId: {
      type: String,
      required: true,
      trim: true,
    },
    screenshotUrl: {
      // Cloudinary secure_url
      type: String,
      required: true,
    },
    screenshotPublicId: {
      // Cloudinary public_id, kept so the image can be moderated/removed later
      type: String,
      default: null,
    },
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["EasyPaisa", "JazzCash", "BankTransfer", "Other"],
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true } // createdAt acts as the deposit "Date"
);

module.exports = mongoose.model("Transaction", TransactionSchema);
