import express from "express";
import Restroom from "../models/Restroom.js";
import User from "../models/User.js";
import Review from "../models/Review.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();
const GUEST_USER_ID = "000000000000000000000001";

const normalizeAmenity = (amenity) => {
  const map = {
    "PWD Friendly": "Accessibility",
    "Accessible": "Accessibility",
    "Child-Friendly": "Child Friendly",
    "Child Friendly Facilities": "Child Friendly",
  };

  return map[amenity] || amenity;
};

const normalizeAmenities = (amenities = []) => {
  const normalized = amenities
    .filter(Boolean)
    .map(normalizeAmenity);

  return [...new Set(normalized)];
};

const normalizeRestroomPayload = (restroom) => {
  if (!restroom) return restroom;

  const plain = typeof restroom.toObject === "function" ? restroom.toObject() : restroom;
  return {
    ...plain,
    amenities: normalizeAmenities(plain.amenities),
  };
};

// @route   POST /api/restrooms
// @desc    Add a new restroom
// @access  Private
router.post("/", protect, async (req, res) => {
  console.log("[POST /api/restrooms] Adding new restroom by user:", req.user._id);
  const { name, description, location, amenities, images, operatingHours } = req.body;

  if (!Array.isArray(images) || images.length < 1) {
    return res.status(400).json({ message: "At least 1 image is required" });
  }

  try {
    const restroom = await Restroom.create({
      name,
      description,
      location,
      amenities: normalizeAmenities(amenities),
      images,
      operatingHours,
      createdBy: req.user._id,
    });

    await User.findByIdAndUpdate(req.user._id, {
      $push: { addedRestrooms: restroom._id },
    });

    console.log("[POST /api/restrooms] Restroom created:", restroom._id);
    res.status(201).json(normalizeRestroomPayload(restroom));
  } catch (error) {
    console.error("[POST /api/restrooms] Error:", error.message);
    res.status(500).json({ message: "Failed to add restroom", error: error.message });
  }
});

// @route   GET /api/restrooms
// @desc    Get all restrooms
// @access  Public
router.get("/", async (req, res) => {
  console.log("[GET /api/restrooms] Fetching all restrooms with average ratings");
  try {
    const restrooms = await Restroom.aggregate([
      {
        $lookup: {
          from: "reviews",
          localField: "_id",
          foreignField: "restroom",
          as: "reviewsList"
        }
      },
      {
        $addFields: {
          averageRating: { $avg: "$reviewsList.rating" }
        }
      },
      {
        $unset: "reviewsList"
      }
    ]);
    
    // Mongoose Model.populate supports arrays of plain objects from aggregate
    const populatedRestrooms = await Restroom.populate(restrooms, [
      { path: "createdBy", select: "username email" },
      { path: "flags", select: "username email" }
    ]);
    
    const normalizedRestrooms = populatedRestrooms.map(normalizeRestroomPayload);

    console.log(`[GET /api/restrooms] Found ${normalizedRestrooms.length} restrooms`);
    res.json(normalizedRestrooms);
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
    const restrooms = await Restroom.find({ createdBy: targetId })
      .populate('createdBy', 'username email')
      .populate('flags', 'username email');
    console.log('   [OK] Found', restrooms.length, 'restrooms');
    console.log('[GET /api/restrooms/user/:userId] ===== REQUEST END =====\n');
    res.json(restrooms.map(normalizeRestroomPayload));
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
    const restroom = await Restroom.findById(req.params.id)
      .populate("createdBy", "username email")
      .populate("flags", "username email");
    if (!restroom) return res.status(404).json({ message: "Restroom not found" });
    res.json(normalizeRestroomPayload(restroom));
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

    const payload = {
      ...req.body,
      amenities: normalizeAmenities(req.body.amenities),
    };

    if (Array.isArray(payload.images) && payload.images.length < 1) {
      return res.status(400).json({ message: "At least 1 image is required" });
    }

    const updated = await Restroom.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    console.log("[PUT /api/restrooms/:id] Restroom updated:", req.params.id);
    res.json(normalizeRestroomPayload(updated));
  } catch (error) {
    console.error("[PUT /api/restrooms/:id] Error:", error.message);
    res.status(500).json({ message: "Failed to update restroom", error: error.message });
  }
});

// @route   DELETE /api/restrooms/:id
// @desc    Delete restroom
// @access  Private
router.delete("/:id", protect, async (req, res) => {
  console.log("[DELETE /api/restrooms/:id] Delete request for:", req.params.id);
  try {
    const restroom = await Restroom.findById(req.params.id);
    if (!restroom) return res.status(404).json({ message: "Restroom not found" });

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

    // Check if this user already flagged this restroom
    const userAlreadyFlagged = restroom.flags.some(
      (userId) => userId.toString() === req.user._id.toString()
    );

    console.log('   Current flags count:', restroom.flags.length);
    console.log('   User already flagged:', userAlreadyFlagged);

    if (userAlreadyFlagged) {
      // Remove flag (UNFLAG) - remove user from flags array
      console.log('   [UNFLAG] Removing user from flags array');
      await Restroom.findByIdAndUpdate(req.params.id, {
        $pull: { flags: req.user._id },
      });
      const updatedRestroom = await Restroom.findById(req.params.id);
      const shouldBeFlagged = updatedRestroom.flags.length >= 2;
      updatedRestroom.isFlagged = shouldBeFlagged;
      await updatedRestroom.save();

      console.log('   [UNFLAG] Updated flags count:', updatedRestroom.flags.length);
      
      // Also remove from user's flaggedRestrooms
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { flaggedRestrooms: restroom._id },
      });

      const message = "Restroom unflagged";
      console.log('[PATCH /api/restrooms/:id/flag] ===== SUCCESS: UNFLAG =====\n');
      res.json({ message, flagged: false, flagCount: updatedRestroom.flags.length, isFlagged: shouldBeFlagged });
    } else {
      // Add flag (FLAG) - add user to flags array
      console.log('   [FLAG] Adding user to flags array');
      await Restroom.findByIdAndUpdate(req.params.id, {
        $addToSet: { flags: req.user._id },
      });
      const updatedRestroom = await Restroom.findById(req.params.id);
      const shouldBeFlagged = updatedRestroom.flags.length >= 2;
      updatedRestroom.isFlagged = shouldBeFlagged;
      await updatedRestroom.save();

      console.log('   [FLAG] Updated flags count:', updatedRestroom.flags.length);

      // Also add to user's flaggedRestrooms
      await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { flaggedRestrooms: restroom._id },
      });

      const message = "Restroom flagged";
      console.log('[PATCH /api/restrooms/:id/flag] ===== SUCCESS: FLAG =====\n');
      res.json({ message, flagged: true, flagCount: updatedRestroom.flags.length, isFlagged: shouldBeFlagged });
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

// @route   PATCH /api/restrooms/:id/photos
// @desc    Add a photo to a restroom
// @access  Private
router.patch("/:id/photos", protect, async (req, res) => {
  console.log("[PATCH /api/restrooms/:id/photos] Add photo request for restroom:", req.params.id, "Auth user:", req.user?._id);
  try {
    const { image } = req.body;
    if (typeof image !== "string" || !image.trim()) {
      return res.status(400).json({ message: "Image is required" });
    }

    const restroom = await Restroom.findById(req.params.id);
    if (!restroom) {
      return res.status(404).json({ message: "Restroom not found" });
    }

    restroom.images = Array.isArray(restroom.images) ? restroom.images : [];
    if (restroom.images.length >= 5) {
      return res.status(400).json({ message: "Maximum 5 photos allowed" });
    }

    restroom.images.push(image.trim());
    await restroom.save();

    console.log("[PATCH /api/restrooms/:id/photos] Photo added. Total images:", restroom.images.length);
    res.json(normalizeRestroomPayload(restroom));
  } catch (error) {
    console.error("[PATCH /api/restrooms/:id/photos] Error:", error.message);
    res.status(500).json({ message: "Failed to upload photo", error: error.message });
  }
});

// @route   DELETE /api/restrooms/:id/photos/:index
// @desc    Remove a photo from a restroom by index
// @access  Private
router.delete("/:id/photos/:index", protect, async (req, res) => {
  console.log("[DELETE /api/restrooms/:id/photos/:index] Remove photo request for restroom:", req.params.id, "index:", req.params.index, "Auth user:", req.user?._id);
  try {
    const index = Number(req.params.index);
    if (!Number.isInteger(index) || index < 0) {
      return res.status(400).json({ message: "Invalid photo index" });
    }

    const restroom = await Restroom.findById(req.params.id);
    if (!restroom) {
      return res.status(404).json({ message: "Restroom not found" });
    }

    restroom.images = Array.isArray(restroom.images) ? restroom.images : [];
    if (index >= restroom.images.length) {
      return res.status(400).json({ message: "Photo index out of range" });
    }
    if (restroom.images.length <= 1) {
      return res.status(400).json({ message: "At least 1 photo is required" });
    }

    restroom.images.splice(index, 1);
    await restroom.save();

    console.log("[DELETE /api/restrooms/:id/photos/:index] Photo removed. Total images:", restroom.images.length);
    res.json(normalizeRestroomPayload(restroom));
  } catch (error) {
    console.error("[DELETE /api/restrooms/:id/photos/:index] Error:", error.message);
    res.status(500).json({ message: "Failed to remove photo", error: error.message });
  }
});

// @route   PATCH /api/restrooms/:id/photos/:index/remove
// @desc    Remove a photo from a restroom by index (PATCH variant for clients with DELETE restrictions)
// @access  Private
router.patch("/:id/photos/:index/remove", protect, async (req, res) => {
  console.log("[PATCH /api/restrooms/:id/photos/:index/remove] Remove photo request for restroom:", req.params.id, "index:", req.params.index, "Auth user:", req.user?._id);
  try {
    const index = Number(req.params.index);
    if (!Number.isInteger(index) || index < 0) {
      return res.status(400).json({ message: "Invalid photo index" });
    }

    const restroom = await Restroom.findById(req.params.id);
    if (!restroom) {
      return res.status(404).json({ message: "Restroom not found" });
    }

    restroom.images = Array.isArray(restroom.images) ? restroom.images : [];
    if (index >= restroom.images.length) {
      return res.status(400).json({ message: "Photo index out of range" });
    }
    if (restroom.images.length <= 1) {
      return res.status(400).json({ message: "At least 1 photo is required" });
    }

    restroom.images.splice(index, 1);
    await restroom.save();

    console.log("[PATCH /api/restrooms/:id/photos/:index/remove] Photo removed. Total images:", restroom.images.length);
    res.json(normalizeRestroomPayload(restroom));
  } catch (error) {
    console.error("[PATCH /api/restrooms/:id/photos/:index/remove] Error:", error.message);
    res.status(500).json({ message: "Failed to remove photo", error: error.message });
  }
});

export default router;
