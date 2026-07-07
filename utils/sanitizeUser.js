// Shapes a consistent, safe user object to send back to clients from any
// route (auth, profile, admin, etc). Never include the password hash.
const sanitizeUser = (user) => ({
  id: user._id,
  nameOnCnic: user.nameOnCnic,
  cityOnCnic: user.cityOnCnic,
  username: user.username,
  email: user.email,
  mobileNumber: user.mobileNumber,
  profileImageUrl: user.profileImageUrl,
  walletBalance: user.walletBalance,
  status: user.status,
  role: user.role,
  isMining: user.isMining,
  miningStartedAt: user.miningStartedAt,
  totalMined: user.totalMined,
  referralCode: user.referralCode,
  referralEarnings: user.referralEarnings,
  createdAt: user.createdAt,
});

module.exports = sanitizeUser;
