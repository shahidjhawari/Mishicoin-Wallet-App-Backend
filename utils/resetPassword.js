// One-off script to force-reset a user's password (e.g. your admin account)
// when you're locked out or unsure what was actually hashed at signup.
//
// Usage:
//   node utils/resetPassword.js <username> <newPassword>
//
// Example:
//   node utils/resetPassword.js admin AdminPass123

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const [, , username, newPassword] = process.argv;

if (!username || !newPassword) {
  console.error("Usage: node utils/resetPassword.js <username> <newPassword>");
  process.exit(1);
}

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const user = await User.findOne({ username: username.toLowerCase().trim() });
    if (!user) {
      console.error(`No user found with username "${username}"`);
      process.exit(1);
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    console.log(`Password reset for "${user.username}" (role: ${user.role}).`);
    console.log(`You can now log in with username="${user.username}" password="${newPassword}"`);
    process.exit(0);
  } catch (error) {
    console.error("Reset failed:", error.message);
    process.exit(1);
  }
})();
