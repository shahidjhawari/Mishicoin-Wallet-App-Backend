const mongoose = require("mongoose");

// Singleton document (key: "global") holding every tunable number in the
// app's earning economy. The admin panel reads/writes this directly, so
// admins can change rates live without touching .env or redeploying.
const SettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "global",
    },

    // Mining ("daily earning")
    miningSessionHours: { type: Number, required: true },
    miningRatePerHour: { type: Number, required: true },

    // Watch-ad earning
    adRewardAmount: { type: Number, required: true },
    adDailyLimit: { type: Number, required: true },

    // Referral earning (3 levels deep)
    referralLevel1Bonus: { type: Number, required: true },
    referralLevel2Bonus: { type: Number, required: true },
    referralLevel3Bonus: { type: Number, required: true },

    // Withdrawals
    minWithdrawalAmount: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Settings", SettingsSchema);
