// Central place for all mining / ads / referral tuning values, so admins
// can adjust the economy from .env without touching route code.
module.exports = {
  MINING_SESSION_HOURS: Number(process.env.MINING_SESSION_HOURS || 24),
  MINING_RATE_PER_HOUR: Number(process.env.MINING_RATE_PER_HOUR || 0.5), // coins/hour
  AD_REWARD_AMOUNT: Number(process.env.AD_REWARD_AMOUNT || 0.2), // coins per ad watched
  AD_DAILY_LIMIT: Number(process.env.AD_DAILY_LIMIT || 20), // max ads/day per user
  REFERRAL_SIGNUP_BONUS: Number(process.env.REFERRAL_SIGNUP_BONUS || 5), // coins credited to referrer
};
