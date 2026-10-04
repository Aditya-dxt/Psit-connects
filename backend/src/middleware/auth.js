const jwt = require("jsonwebtoken");

function auth(requiredRoles = []) {
  return (req, res, next) => {
    try {
      const header = req.headers.authorization;

      if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      const token = header.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (requiredRoles.length && !requiredRoles.includes(decoded.role)) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }

      req.user = decoded;
      next();
    } catch {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
  };
}

module.exports = auth;
