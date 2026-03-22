import express from "express";
import Review from "../models/Review.js";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// @route   POST /api/reviews
// @desc    Add a review for a restroom
// @access  Private
router.post("/", protect, async (req, res) => {
  console.log("[POST /api/reviews] Review by user:", req.user._id, "for restroom:", req.body.restroomId);
  const { restroomId, rating, comment } = req.body;

  try {
    const existingReview = await Review.findOne({ restroom: restroomId, user: req.user._id });
    if (existingReview) {
      return res.status(400).json({ message: "You have already reviewed this restroom." });
    }

    const review = await Review.create({
      restroom: restroomId,
      user: req.user._id,
      rating,
      comment,
    });

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { reviewedRestrooms: restroomId },
    });

    console.log("[POST /api/reviews] Review created:", review._id);
    res.status(201).json(review);
  } catch (error) {
    console.error("[POST /api/reviews] Error:", error.message);
    res.status(500).json({ message: "Failed to submit review", error: error.message });
  }
});

// @route   GET /api/reviews/:restroomId
// @desc    Get all reviews for a specific restroom
// @access  Public
router.get("/:restroomId", async (req, res) => {
  console.log("[GET /api/reviews/:restroomId] Fetching reviews for restroom:", req.params.restroomId);
  try {
    const reviews = await Review.find({ restroom: req.params.restroomId }).populate(
      "user",
      "username"
    );
    console.log(`[GET /api/reviews/:restroomId] Found ${reviews.length} reviews`);
    res.json(reviews);
  } catch (error) {
    console.error("[GET /api/reviews/:restroomId] Error:", error.message);
    res.status(500).json({ message: "Failed to fetch reviews", error: error.message });
  }
});


// @route   DELETE /api/reviews/:id
// @desc    Delete a review (owner only) and update user's reviewedRestrooms
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  console.log('[DELETE /api/reviews/:id] Delete review request:', req.params.id, 'Auth user:', req.user._id);
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    // Only the review's author or an admin may delete
    if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this review' });
    }

    // remove the review
    await review.deleteOne();

    // remove restroom id from user's reviewedRestrooms
    try {
      await User.findByIdAndUpdate(req.user._id, { $pull: { reviewedRestrooms: review.restroom } });
    } catch (uErr) {
      console.error('[DELETE /api/reviews/:id] Failed to update user reviewedRestrooms:', uErr);
    }

    console.log('[DELETE /api/reviews/:id] Review deleted:', req.params.id);
    res.json({ message: 'Review deleted successfully', reviewId: req.params.id });
  } catch (error) {
    console.error('[DELETE /api/reviews/:id] Error:', error.message);
    res.status(500).json({ message: 'Failed to delete review', error: error.message });
  }
});

// @route   PUT /api/reviews/:id
// @desc    Update a review
// @access  Private
router.put('/:id', protect, async (req, res) => {
  console.log('[PUT /api/reviews/:id] Edit review request:', req.params.id, 'Auth user:', req.user._id);
  try {
    const { rating, comment } = req.body;
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    // Only the review's author may edit
    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this review' });
    }

    if (rating) review.rating = rating;
    if (comment !== undefined) review.comment = comment; // allow empty comment
    await review.save();

    console.log('[PUT /api/reviews/:id] Review updated:', req.params.id);
    res.json(review);
  } catch (error) {
    console.error('[PUT /api/reviews/:id] Error:', error.message);
    res.status(500).json({ message: 'Failed to update review', error: error.message });
  }
});

export default router;
