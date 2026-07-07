const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    // Personal / KYC-style details (as printed on CNIC)
    nameOnCnic: {
      type: String,
      required: true,
      trim: true,
    },
    cityOnCnic: {
      type: String,
      required: true,
      trim: true,
    },

    // Account identity
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },

    // Profile picture (Cloudinary secure_url)
    profileImageUrl: {
      type: String,
      default: null,
    },

    // Wallet
    walletBalance: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "blocked"],
      default: "active",
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    // Mining
    isMining: {
      type: Boolean,
      default: false,
    },
    miningStartedAt: {
      type: Date,
      default: null,
    },
    lastClaimedAt: {
      type: Date,
      default: null,
    },
    totalMined: {
      type: Number,
      default: 0,
    },

    // Watch-ads rewards
    adsWatchedToday: {
      type: Number,
      default: 0,
    },
    lastAdWatchDate: {
      type: String, // stored as YYYY-MM-DD for easy daily-reset comparison
      default: null,
    },

    // Referral / invite friends
    referralCode: {
      type: String,
      required: true,
      unique: true,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    referralEarnings: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
