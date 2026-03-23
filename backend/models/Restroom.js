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
    address: { type: String, trim: true },
  },
  amenities: {
    type: [String],
    enum: ["Bidet", "Soap", "Accessibility", "Child Friendly", "PWD Friendly"],
    default: [],
  },
  operatingHours: {
    is24Hours: { type: Boolean, default: false },
    openTime: { type: String, trim: true },
    closeTime: { type: String, trim: true }
  },
  images: {
    type: [String],
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
  flags: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
});

export default mongoose.model("Restroom", restroomSchema);
