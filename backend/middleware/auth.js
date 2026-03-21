import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Verify JWT and attach user to request
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log('[AUTH MIDDLEWARE] Checking authorization...');
  console.log('[AUTH MIDDLEWARE] Authorization header present:', !!authHeader);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.error('[AUTH MIDDLEWARE] BLOCKED: No/invalid auth header');
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  const token = authHeader.split(" ")[1];
  console.log('[AUTH MIDDLEWARE] Token present:', !!token, 'Length:', token ? token.length : 0);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('[AUTH MIDDLEWARE] Token verified, userId:', decoded.id);
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      console.error('[AUTH MIDDLEWARE] BLOCKED: User not found in DB');
      return res.status(401).json({ message: "User not found" });
    }

    console.log('[AUTH MIDDLEWARE] User attached:', req.user._id, 'role:', req.user.role);
    next();
  } catch (error) {
    console.error('[AUTH MIDDLEWARE] Token error:', error.message);
    return res.status(401).json({ message: "Token invalid or expired" });
  }
};

// Allow only admin users
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }
  return res.status(403).json({ message: "Access denied: Admins only" });
};

export { protect, adminOnly };
