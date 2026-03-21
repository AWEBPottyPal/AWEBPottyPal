import express from "express";
import Restroom from "../models/Restroom.js";
import User from "../models/User.js";
import Review from "../models/Review.js";
import { protect, adminOnly } from "../middleware/auth.js";

const router = express.Router();

// Middleware: Protect all routes and check for admin role
router.use(protect, adminOnly);

// @route   GET /api/admin/flagged-restrooms
// @desc    Get all flagged restrooms with user info and sorting
// @access  Private (Admin only)
router.get("/flagged-restrooms", async (req, res) => {
  console.log('\n[GET /api/admin/flagged-restrooms] ===== REQUEST START =====');
  console.log('   Admin user:', req.user._id);
  console.log('   Query params:', req.query);

  try {
    const { sortBy = "flags", order = "desc" } = req.query;
    console.log('   Sort by:', sortBy, 'Order:', order);

    // Fetch only flagged restrooms with populated flags (user info)
    let query = Restroom.find({ isFlagged: true })
      .populate("createdBy", "username email")
      .populate("flags", "username email");

    const restrooms = await query.exec();
    console.log('   Found', restrooms.length, 'flagged restrooms');

    // Add metadata to each restroom
    const enrichedRestrooms = restrooms.map((r) => ({
      ...r.toObject(),
      flagCount: r.flags.length,
      flaggedUsers: r.flags,
      createdAtDate: r.createdAt,
    }));

    // Sort based on sortBy parameter
    if (sortBy === "flags") {
      enrichedRestrooms.sort((a, b) =>
        order === "desc" ? b.flagCount - a.flagCount : a.flagCount - b.flagCount
      );
    } else if (sortBy === "date") {
      enrichedRestrooms.sort((a, b) =>
        order === "desc"
          ? new Date(b.createdAtDate) - new Date(a.createdAtDate)
          : new Date(a.createdAtDate) - new Date(b.createdAtDate)
      );
    }

    console.log('[GET /api/admin/flagged-restrooms] ===== SUCCESS =====\n');
    res.json(enrichedRestrooms);
  } catch (error) {
    console.error('[GET /api/admin/flagged-restrooms] Error:', error.message);
    res.status(500).json({
      message: "Failed to fetch flagged restrooms",
      error: error.message,
    });
  }
});

// @route   PATCH /api/admin/restrooms/:id/unflag
// @desc    Admin unflag a restroom (remove from flags array)
// @access  Private (Admin only)
router.patch("/restrooms/:id/unflag", async (req, res) => {
  console.log('[PATCH /api/admin/restrooms/:id/unflag] Unflag request for:', req.params.id);
  try {
    const restroom = await Restroom.findById(req.params.id);
    if (!restroom) {
      return res.status(404).json({ message: "Restroom not found" });
    }

    // Clear all flags
    console.log('   Current flag count:', restroom.flags.length);
    restroom.flags = [];
    restroom.isFlagged = false;
    await restroom.save();

    console.log('[PATCH /api/admin/restrooms/:id/unflag] Restroom unflagged by admin');
    res.json({ message: "Restroom unflagged by admin", flagCount: 0 });
  } catch (error) {
    console.error('[PATCH /api/admin/restrooms/:id/unflag] Error:', error.message);
    res.status(500).json({
      message: "Failed to unflag restroom",
      error: error.message,
    });
  }
});

// @route   DELETE /api/admin/restrooms/:id
// @desc    Admin delete any restroom
// @access  Private (Admin only)
router.delete("/restrooms/:id", async (req, res) => {
  console.log('[DELETE /api/admin/restrooms/:id] Delete request for:', req.params.id);
  try {
    const restroom = await Restroom.findById(req.params.id);
    if (!restroom) {
      return res.status(404).json({ message: "Restroom not found" });
    }

    // Delete the restroom
    await restroom.deleteOne();

    // Cleanup: remove from user arrays and related reviews
    try {
      await Promise.all([
        User.updateMany({ savedRestrooms: restroom._id }, { $pull: { savedRestrooms: restroom._id } }),
        User.updateMany({ flaggedRestrooms: restroom._id }, { $pull: { flaggedRestrooms: restroom._id } }),
        User.updateMany({ reviewedRestrooms: restroom._id }, { $pull: { reviewedRestrooms: restroom._id } }),
        User.updateOne({ _id: restroom.createdBy }, { $pull: { addedRestrooms: restroom._id } }),
        Review.deleteMany({ restroom: restroom._id }),
      ]);
    } catch (cleanupErr) {
      console.error('[DELETE /api/admin/restrooms/:id] Cleanup error:', cleanupErr);
    }

    console.log('[DELETE /api/admin/restrooms/:id] Restroom deleted by admin');
    res.json({ message: "Restroom deleted by admin" });
  } catch (error) {
    console.error('[DELETE /api/admin/restrooms/:id] Error:', error.message);
    res.status(500).json({
      message: "Failed to delete restroom",
      error: error.message,
    });
  }
});

export default router;
