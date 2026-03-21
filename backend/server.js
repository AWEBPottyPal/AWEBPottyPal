import "dotenv/config";
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import restroomRoutes from "./routes/restroomRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/restrooms", restroomRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reviews", reviewRoutes);

// Health check
app.get("/", (req, res) => res.json({ message: "PottyPal API is running 🚻" }));

// 404 handler
app.use((req, res) => res.status(404).json({ message: "Route not found" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
