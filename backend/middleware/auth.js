import jwt from "jsonwebtoken";
import User from "../models/User.js";

const GUEST_USER_ID = "000000000000000000000001";

const getOrCreateGuestUser = async () => {
  let guest = await User.findById(GUEST_USER_ID).select("-password");
  if (!guest) {
    guest = await User.create({
      _id: GUEST_USER_ID,
      username: "Guest",
      email: "guest@pottypal.local",
      role: "user",
      password: "",
    });
  }
  return guest;
};

// Verify JWT and attach user to request
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log('[AUTH MIDDLEWARE] Checking authorization...');
  console.log('[AUTH MIDDLEWARE] Authorization header present:', !!authHeader);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    req.user = await getOrCreateGuestUser();
    console.log('[AUTH MIDDLEWARE] No token provided, continuing as guest:', req.user._id);
    return next();
  }

  const token = authHeader.split(" ")[1];
  console.log('[AUTH MIDDLEWARE] Token present:', !!token, 'Length:', token ? token.length : 0);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('[AUTH MIDDLEWARE] Token verified, userId:', decoded.id);
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      req.user = await getOrCreateGuestUser();
      console.log('[AUTH MIDDLEWARE] Token user not found, continuing as guest:', req.user._id);
      return next();
    }

    console.log('[AUTH MIDDLEWARE] User attached:', req.user._id, 'role:', req.user.role);
    next();
  } catch (error) {
    console.error('[AUTH MIDDLEWARE] Token error, falling back to guest:', error.message);
    req.user = await getOrCreateGuestUser();
    return next();
  }
};

// Allow only admin users
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }
  console.error('[ADMIN MIDDLEWARE] Access denied for user:', req.user?._id, 'role:', req.user?.role);
  return res.status(403).json({ message: "Access denied: Admins only" });
};

export { protect, adminOnly };
