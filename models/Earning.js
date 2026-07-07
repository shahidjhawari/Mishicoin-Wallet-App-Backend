const mongoose = require("mongoose");

// Records every non-deposit/withdrawal money-in event (mining, watch-ad,
// referral bonus) so they show up in the wallet history alongside deposits
// and withdrawals. Deposits/withdrawals already have their own models
// (Transaction / Withdrawal) with a status lifecycle; this model exists
// for the instant, always-"Completed" earning events.
const EarningSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["Mining", "AdReward", "ReferralBonus"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Earning", EarningSchema);
