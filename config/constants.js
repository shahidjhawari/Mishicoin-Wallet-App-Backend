// Central place for all mining / ads / referral tuning values, so the
// entire app's earning economy can be adjusted from .env without touching
// any route code.
module.exports = {
  // Daily / mining earning
  MINING_SESSION_HOURS: Number(process.env.MINING_SESSION_HOURS || 24),
  MINING_RATE_PER_HOUR: Number(process.env.MINING_RATE_PER_HOUR || 0.5), // coins/hour

  // Watch-ad earning
  AD_REWARD_AMOUNT: Number(process.env.AD_REWARD_AMOUNT || 0.2), // coins per ad watched
  AD_DAILY_LIMIT: Number(process.env.AD_DAILY_LIMIT || 20), // max ads/day per user

  // Referral earning — 3-level deep, each level configurable independently
  REFERRAL_LEVEL_1_BONUS: Number(process.env.REFERRAL_LEVEL_1_BONUS || 5), // direct invite
  REFERRAL_LEVEL_2_BONUS: Number(process.env.REFERRAL_LEVEL_2_BONUS || 2), // invite of your invite
  REFERRAL_LEVEL_3_BONUS: Number(process.env.REFERRAL_LEVEL_3_BONUS || 1), // 3rd level down

  // Withdrawals
  MIN_WITHDRAWAL_AMOUNT: Number(process.env.MIN_WITHDRAWAL_AMOUNT || 50), // coins
};
