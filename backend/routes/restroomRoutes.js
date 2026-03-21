import express from "express";
import Restroom from "../models/Restroom.js";
import User from "../models/User.js";
import Review from "../models/Review.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// @route   POST /api/restrooms
// @desc    Add a new restroom
// @access  Private
router.post("/", protect, async (req, res) => {
  console.log("[POST /api/restrooms] Adding new restroom by user:", req.user._id);
  const { name, description, location, amenities } = req.body;

  try {
    const restroom = await Restroom.create({
      name,
      description,
      location,
      amenities,
      createdBy: req.user._id,
    });

    await User.findByIdAndUpdate(req.user._id, {
      $push: { addedRestrooms: restroom._id },
    });

    console.log("[POST /api/restrooms] Restroom created:", restroom._id);
    res.status(201).json(restroom);
  } catch (error) {
    console.error("[POST /api/restrooms] Error:", error.message);
    res.status(500).json({ message: "Failed to add restroom", error: error.message });
  }
});

// @route   GET /api/restrooms
// @desc    Get all restrooms
// @access  Public
router.get("/", async (req, res) => {
  console.log("[GET /api/restrooms] Fetching all restrooms");
  try {
    const restrooms = await Restroom.find().populate("createdBy", "username email");
    console.log(`[GET /api/restrooms] Found ${restrooms.length} restrooms`);
    res.json(restrooms);
  } catch (error) {
    console.error("[GET /api/restrooms] Error:", error.message);
    res.status(500).json({ message: "Failed to fetch restrooms", error: error.message });
  }
});


// @route   GET /api/restrooms/user/:userId
// @desc    Get restrooms added by a specific user
// @access  Private (user themselves or admin)
router.get("/user/:userId", protect, async (req, res) => {
  console.log('\n[GET /api/restrooms/user/:userId] ===== REQUEST START =====');
  console.log('   Target userId:', req.params.userId);
  console.log('   Authenticated user:', req.user ? req.user._id : 'NONE');
  console.log('   User role:', req.user ? req.user.role : 'N/A');
  
  try {
    const requesterId = req.user._id.toString();
    const targetId = req.params.userId;

    console.log('   Requester ID (toString):', requesterId);
    console.log('   Target ID:', targetId);
    console.log('   Access check:', requesterId === targetId ? 'SAME USER' : req.user.role === 'admin' ? 'ADMIN' : 'DENIED');

    if (requesterId !== targetId && req.user.role !== 'admin') {
      console.log('   [DENIED] Access denied');
      return res.status(403).json({ message: 'Access denied: can only view your own added restrooms' });
    }

    console.log('   [OK] Access granted, querying DB...');
    const restrooms = await Restroom.find({ createdBy: targetId }).populate('createdBy', 'username email');
    console.log('   [OK] Found', restrooms.length, 'restrooms');
    console.log('[GET /api/restrooms/user/:userId] ===== REQUEST END =====\n');
    res.json(restrooms);
  } catch (error) {
    console.error('[GET /api/restrooms/user/:userId] ===== ERROR =====');
    console.error('   Message:', error.message);
    console.error('   Stack:', error.stack);
    console.error('[GET /api/restrooms/user/:userId] ===== ERROR END =====\n');
    res.status(500).json({ message: 'Failed to fetch user restrooms', error: error.message });
  }
});

// @route   GET /api/restrooms/:id
// @desc    Get one restroom by ID
// @access  Public
router.get("/:id", async (req, res) => {
  console.log("[GET /api/restrooms/:id] Fetching restroom:", req.params.id);
  try {
    const restroom = await Restroom.findById(req.params.id).populate(
      "createdBy",
      "username email"
    );
    if (!restroom) return res.status(404).json({ message: "Restroom not found" });
    res.json(restroom);
  } catch (error) {
    console.error("[GET /api/restrooms/:id] Error:", error.message);
    res.status(500).json({ message: "Failed to fetch restroom", error: error.message });
  }
});

// @route   PUT /api/restrooms/:id
// @desc    Update restroom (creator or admin only)
// @access  Private
router.put("/:id", protect, async (req, res) => {
  console.log("[PUT /api/restrooms/:id] Update request for:", req.params.id);
  try {
    const restroom = await Restroom.findById(req.params.id);
    if (!restroom) return res.status(404).json({ message: "Restroom not found" });

    const isOwner = restroom.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to update this restroom" });
    }

    const updated = await Restroom.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    console.log("[PUT /api/restrooms/:id] Restroom updated:", req.params.id);
    res.json(updated);
  } catch (error) {
    console.error("[PUT /api/restrooms/:id] Error:", error.message);
    res.status(500).json({ message: "Failed to update restroom", error: error.message });
  }
});

// @route   DELETE /api/restrooms/:id
// @desc    Delete restroom (creator or admin only)
// @access  Private
router.delete("/:id", protect, async (req, res) => {
  console.log("[DELETE /api/restrooms/:id] Delete request for:", req.params.id);
  try {
    const restroom = await Restroom.findById(req.params.id);
    if (!restroom) return res.status(404).json({ message: "Restroom not found" });

    const isOwner = restroom.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to delete this restroom" });
    }

    // delete the restroom
    await restroom.deleteOne();

    // cleanup: remove this restroom id from any user's saved/flagged/reviewed/added arrays
    try {
      await Promise.all([
        User.updateMany({ savedRestrooms: restroom._id }, { $pull: { savedRestrooms: restroom._id } }),
        User.updateMany({ flaggedRestrooms: restroom._id }, { $pull: { flaggedRestrooms: restroom._id } }),
        User.updateMany({ reviewedRestrooms: restroom._id }, { $pull: { reviewedRestrooms: restroom._id } }),
        User.updateOne({ _id: restroom.createdBy }, { $pull: { addedRestrooms: restroom._id } }),
        // remove reviews associated with this restroom
        Review.deleteMany({ restroom: restroom._id }),
      ]);
    } catch (cleanupErr) {
      console.error('[DELETE /api/restrooms/:id] Cleanup error:', cleanupErr);
    }

    console.log("[DELETE /api/restrooms/:id] Restroom deleted:", req.params.id);
    res.json({ message: "Restroom deleted successfully" });
  } catch (error) {
    console.error("[DELETE /api/restrooms/:id] Error:", error.message);
    res.status(500).json({ message: "Failed to delete restroom", error: error.message });
  }
});


// @route   GET /api/restrooms/user/:userId
// @desc    Get restrooms added by a specific user
// @access  Private (user themselves or admin)
// NOTE: route moved earlier in file to avoid collision with '/:id'

// @route   PATCH /api/restrooms/:id/flag
// @desc    Flag a restroom (toggle on/off)
// @access  Private
router.patch("/:id/flag", protect, async (req, res) => {
  console.log('\n[PATCH /api/restrooms/:id/flag] ===== REQUEST START =====');
  console.log('   Restroom ID:', req.params.id);
  console.log('   Auth user ID:', req.user._id);
  try {
    const restroom = await Restroom.findById(req.params.id);
    if (!restroom) {
      console.log('   [NOT FOUND] Restroom not found');
      return res.status(404).json({ message: "Restroom not found" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      console.log('   [NOT FOUND] User not found');
      return res.status(404).json({ message: "User not found" });
    }

    // Check if already flagged
    const alreadyFlagged = user.flaggedRestrooms.some(
      (id) => id.toString() === restroom._id.toString()
    );

    console.log('   Current flaggedRestrooms count:', user.flaggedRestrooms.length);
    console.log('   Already flagged by this user:', alreadyFlagged);

    if (alreadyFlagged) {
      // Remove flag (UNFLAG)
      console.log('   [UNFLAG] Removing restroom from user flaggedRestrooms');
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { flaggedRestrooms: restroom._id },
      });
      const updatedUser = await User.findById(req.user._id);
      console.log('   [UNFLAG] Updated user flaggedRestrooms count:', updatedUser.flaggedRestrooms.length);
      const message = "Restroom unflagged";
      console.log('[PATCH /api/restrooms/:id/flag] ===== SUCCESS: UNFLAG =====\n');
      res.json({ message, flagged: false });
    } else {
      // Add flag (FLAG)
      console.log('   [FLAG] Adding restroom to user flaggedRestrooms');
      await Restroom.findByIdAndUpdate(req.params.id, { isFlagged: true }, { new: true });
      await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { flaggedRestrooms: restroom._id },
      });
      const updatedUser = await User.findById(req.user._id);
      console.log('   [FLAG] Updated user flaggedRestrooms count:', updatedUser.flaggedRestrooms.length);
      const message = "Restroom flagged";
      console.log('[PATCH /api/restrooms/:id/flag] ===== SUCCESS: FLAG =====\n');
      res.json({ message, flagged: true });
    }
  } catch (error) {
    console.error('[PATCH /api/restrooms/:id/flag] ===== ERROR =====');
    console.error('   Message:', error.message);
    console.error('   Stack:', error.stack);
    console.error('[PATCH /api/restrooms/:id/flag] ===== ERROR END =====\n');
    res.status(500).json({ message: "Failed to flag restroom", error: error.message });
  }
});

// @route   PATCH /api/restrooms/:id/save
// @desc    Save / bookmark a restroom (toggle)
// @access  Private
router.patch("/:id/save", protect, async (req, res) => {
  console.log("[PATCH /api/restrooms/:id/save] Save request for restroom:", req.params.id, "Auth user:", req.user._id);
  try {
    if (!req.user || !req.user._id) {
      console.error("[PATCH /api/restrooms/:id/save] No authenticated user");
      return res.status(401).json({ message: "Not authenticated" });
    }

    const restroom = await Restroom.findById(req.params.id);
    if (!restroom) {
      console.error("[PATCH /api/restrooms/:id/save] Restroom not found:", req.params.id);
      return res.status(404).json({ message: "Restroom not found" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      console.error("[PATCH /api/restrooms/:id/save] User not found:", req.user._id);
      return res.status(404).json({ message: "User not found" });
    }

    const alreadySaved = user.savedRestrooms.some(
      (id) => id.toString() === restroom._id.toString()
    );
    console.log("[PATCH /api/restrooms/:id/save] Already saved:", alreadySaved);

    const update = alreadySaved
      ? { $pull: { savedRestrooms: restroom._id } }
      : { $addToSet: { savedRestrooms: restroom._id } };

    const updatedUser = await User.findByIdAndUpdate(req.user._id, update, { new: true });
    console.log("[PATCH /api/restrooms/:id/save] Updated user savedRestrooms count:", updatedUser.savedRestrooms.length);

    const message = alreadySaved ? "Restroom unsaved" : "Restroom saved";
    console.log(`[PATCH /api/restrooms/:id/save] Success - ${message}:`, restroom._id);
    res.json({ message, saved: !alreadySaved });
  } catch (error) {
    console.error("[PATCH /api/restrooms/:id/save] Error:", error.message, error.stack);
    res.status(500).json({ message: "Failed to save restroom", error: error.message });
  }
});

export default router;
