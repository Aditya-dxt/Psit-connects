const jwt = require("jsonwebtoken");

function createToken(user) {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role,
      mobile: user.mobile
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d"
    }
  );
}

module.exports = {
  createToken
};