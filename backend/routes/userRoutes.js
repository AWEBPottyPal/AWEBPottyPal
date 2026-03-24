import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Review from "../models/Review.js";
import Restroom from "../models/Restroom.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Helper: generate JWT
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

// @route   POST /api/users/signup
// @desc    Register a new user
// @access  Public
router.post("/signup", async (req, res) => {
  console.log("[POST /api/users/signup] Signup attempt for email:", req.body.email);
  const { username, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hashedPassword });

    console.log("[POST /api/users/signup] User created:", user._id);
    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("[POST /api/users/signup] Error:", error.message);
    res.status(500).json({ message: "Signup failed", error: error.message });
  }
});

// @route   POST /api/users/login
// @desc    Authenticate user and return token
// @access  Public
router.post("/login", async (req, res) => {
  console.log("[POST /api/users/login] Login attempt for email:", req.body.email);
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    console.log("[POST /api/users/login] Login successful for user:", user._id);
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("[POST /api/users/login] Error:", error.message);
    res.status(500).json({ message: "Login failed", error: error.message });
  }
});

// @route   GET /api/users/profile/:id
// @desc    Get user profile
// @access  Public
router.get("/profile/:id", async (req, res) => {
  console.log("[GET /api/users/profile/:id] Fetching profile for:", req.params.id);
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.json({
        _id: req.params.id,
        username: "Guest",
        email: "guest@pottypal.local",
        role: "user",
      });
    }
    res.json(user);
  } catch (error) {
    console.error("[GET /api/users/profile/:id] Error:", error.message);
    res.status(500).json({ message: "Error fetching profile", error: error.message });
  }
});

// @route   GET /api/users/saved-restrooms/:id
// @desc    Get user's saved restrooms
// @access  Public
router.get("/saved-restrooms/:id", async (req, res) => {
  console.log("[GET /api/users/saved-restrooms/:id] Fetching for user:", req.params.id);
  try {
    const user = await User.findById(req.params.id).populate("savedRestrooms");
    if (!user) return res.json([]);
    console.log("[GET /api/users/saved-restrooms/:id] Count:", user.savedRestrooms.length, "Data:", user.savedRestrooms);
    res.json(user.savedRestrooms);
  } catch (error) {
    console.error("[GET /api/users/saved-restrooms/:id] Error:", error.message);
    res.status(500).json({ message: "Error fetching saved restrooms", error: error.message });
  }
});

// @route   GET /api/users/flagged-restrooms/:id
// @desc    Get user's flagged restrooms
// @access  Public
router.get("/flagged-restrooms/:id", async (req, res) => {
  console.log("[GET /api/users/flagged-restrooms/:id] Fetching for user:", req.params.id);
  try {
    const user = await User.findById(req.params.id).populate("flaggedRestrooms");
    if (!user) return res.json([]);
    console.log("[GET /api/users/flagged-restrooms/:id] Count:", user.flaggedRestrooms.length, "Data:", user.flaggedRestrooms);
    res.json(user.flaggedRestrooms);
  } catch (error) {
    console.error("[GET /api/users/flagged-restrooms/:id] Error:", error.message);
    res.status(500).json({ message: "Error fetching flagged restrooms", error: error.message });
  }
});

// @route   GET /api/users/reviewed-restrooms/:id
// @desc    Get user's reviewed restrooms and review comments
// @access  Public
router.get("/reviewed-restrooms/:id", async (req, res) => {
  console.log("[GET /api/users/reviewed-restrooms/:id] Fetching for user:", req.params.id);
  try {
    const reviews = await Review.find({ user: req.params.id }).populate("restroom");
    console.log("[GET /api/users/reviewed-restrooms/:id] Count:", reviews.length);
    res.json(reviews);
  } catch (error) {
    console.error("[GET /api/users/reviewed-restrooms/:id] Error:", error.message);
    res.status(500).json({ message: "Error fetching reviewed restrooms", error: error.message });
  }
});

// @route   PATCH /api/users/:id/save
// @desc    Save / unsave a restroom for a user (toggle)
// @access  Private
router.patch("/:id/save", protect, async (req, res) => {
  console.log("[PATCH /api/users/:id/save] User:", req.params.id, "Restroom:", req.body.restroomId);
  const { restroomId } = req.body;

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const alreadySaved = user.savedRestrooms.some(
      (id) => id.toString() === restroomId
    );

    const update = alreadySaved
      ? { $pull: { savedRestrooms: restroomId } }
      : { $addToSet: { savedRestrooms: restroomId } };

    const updated = await User.findByIdAndUpdate(req.params.id, update, { new: true });

    const message = alreadySaved ? "Restroom unsaved" : "Restroom saved";
    console.log(`[PATCH /api/users/:id/save] ${message}`);
    res.json({ message, savedRestrooms: updated.savedRestrooms });
  } catch (error) {
    console.error("[PATCH /api/users/:id/save] Error:", error.message);
    res.status(500).json({ message: "Failed to update saved restrooms", error: error.message });
  }
});

// @route   PATCH /api/users/:id/flag
// @desc    Flag / unflag a restroom for a user (toggle)
// @access  Private
router.patch("/:id/flag", protect, async (req, res) => {
  console.log("[PATCH /api/users/:id/flag] User:", req.params.id, "Restroom:", req.body.restroomId);
  const { restroomId } = req.body;

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const alreadyFlagged = user.flaggedRestrooms.some(
      (id) => id.toString() === restroomId
    );

    const update = alreadyFlagged
      ? { $pull: { flaggedRestrooms: restroomId } }
      : { $addToSet: { flaggedRestrooms: restroomId } };

    const updated = await User.findByIdAndUpdate(req.params.id, update, { new: true });

    // Also mark isFlagged on the Restroom document
    if (!alreadyFlagged) {
      await Restroom.findByIdAndUpdate(restroomId, { isFlagged: true });
    }

    const message = alreadyFlagged ? "Restroom unflagged" : "Restroom flagged";
    console.log(`[PATCH /api/users/:id/flag] ${message}`);
    res.json({ message, flaggedRestrooms: updated.flaggedRestrooms });
  } catch (error) {
    console.error("[PATCH /api/users/:id/flag] Error:", error.message);
    res.status(500).json({ message: "Failed to update flagged restrooms", error: error.message });
  }
});

// @route   PATCH /api/users/:id/review
// @desc    Add a review for a restroom
// @access  Private
router.patch("/:id/review", protect, async (req, res) => {
  console.log("[PATCH /api/users/:id/review] User:", req.params.id, "Restroom:", req.body.restroomId);
  const { restroomId, rating, comment } = req.body;

  try {
    const review = await Review.create({
      restroom: restroomId,
      user: req.params.id,
      rating,
      comment,
    });

    await User.findByIdAndUpdate(req.params.id, {
      $addToSet: { reviewedRestrooms: restroomId },
    });

    console.log("[PATCH /api/users/:id/review] Review created:", review._id);
    res.status(201).json({ message: "Review submitted", review });
  } catch (error) {
    console.error("[PATCH /api/users/:id/review] Error:", error.message);
    res.status(500).json({ message: "Failed to submit review", error: error.message });
  }
});

export default router;
