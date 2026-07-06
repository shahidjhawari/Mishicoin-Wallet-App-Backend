const User = require("../models/User");

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0/I/1 to avoid confusion

const randomCode = (length = 7) => {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return code;
};

// Generates a unique referral code, retrying on the rare collision.
const generateUniqueReferralCode = async () => {
  let code;
  let exists = true;

  while (exists) {
    code = randomCode();
    exists = await User.exists({ referralCode: code });
  }

  return code;
};

module.exports = { generateUniqueReferralCode };
