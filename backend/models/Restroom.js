import mongoose from "mongoose";

const restroomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Restroom name is required"],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  location: {
    latitude: { type: Number },
    longitude: { type: Number },
  },
  amenities: {
    type: [String],
    enum: ["Bidet", "Soap", "PWD Friendly", "Clean", "Lock", "Tissue"],
    default: [],
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  isFlagged: {
    type: Boolean,
    default: false,
  },
});

export default mongoose.model("Restroom", restroomSchema);
