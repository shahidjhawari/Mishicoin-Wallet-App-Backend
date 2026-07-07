const Settings = require("../models/Settings");
const defaults = require("../config/constants");

const SETTINGS_KEY = "global";

const ALLOWED_FIELDS = [
  "miningSessionHours",
  "miningRatePerHour",
  "adRewardAmount",
  "adDailyLimit",
  "referralLevel1Bonus",
  "referralLevel2Bonus",
  "referralLevel3Bonus",
  "minWithdrawalAmount",
];

// Fetches the single global settings document, creating it from .env
// defaults the very first time the app runs (so there's never a "missing
// settings" state anywhere else in the codebase).
const getSettings = async () => {
  let settings = await Settings.findOne({ key: SETTINGS_KEY });

  if (!settings) {
    settings = await Settings.create({
      key: SETTINGS_KEY,
      miningSessionHours: defaults.MINING_SESSION_HOURS,
      miningRatePerHour: defaults.MINING_RATE_PER_HOUR,
      adRewardAmount: defaults.AD_REWARD_AMOUNT,
      adDailyLimit: defaults.AD_DAILY_LIMIT,
      referralLevel1Bonus: defaults.REFERRAL_LEVEL_1_BONUS,
      referralLevel2Bonus: defaults.REFERRAL_LEVEL_2_BONUS,
      referralLevel3Bonus: defaults.REFERRAL_LEVEL_3_BONUS,
      minWithdrawalAmount: defaults.MIN_WITHDRAWAL_AMOUNT,
    });
  }

  return settings;
};

// Applies a partial update (e.g. from the admin panel's settings form).
// Unknown fields are ignored; blank/undefined values are left untouched.
const updateSettings = async (updates) => {
  const settings = await getSettings();

  ALLOWED_FIELDS.forEach((field) => {
    const value = updates[field];
    if (value !== undefined && value !== null && value !== "") {
      const numeric = Number(value);
      if (!Number.isNaN(numeric)) {
        settings[field] = numeric;
      }
    }
  });

  await settings.save();
  return settings;
};

module.exports = { getSettings, updateSettings };
