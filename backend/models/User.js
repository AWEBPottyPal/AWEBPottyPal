import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "Username is required"],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String, // Store hashed password only
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  savedRestrooms: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restroom",
    },
  ],
  flaggedRestrooms: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restroom",
    },
  ],
  reviewedRestrooms: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restroom",
    },
  ],
  addedRestrooms: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restroom",
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("User", userSchema);
