import express from "express";
import axios from "axios";

const router = express.Router();

// Proxy for OpenRouteService directions
router.post("/directions", async (req, res) => {
  const { start, end, profile = 'driving-car' } = req.body;

  if (!start || !end) {
    return res.status(400).json({ message: "Start and end coordinates are required" });
  }

  const apiKey = process.env.ORS_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ message: "ORS API Key is not configured on the server" });
  }

  // Validate profile
  const validProfiles = ['driving-car', 'foot-walking'];
  const safeProfile = validProfiles.includes(profile) ? profile : 'driving-car';

  try {
    const response = await axios.post(
      `https://api.openrouteservice.org/v2/directions/${safeProfile}/geojson`,
      {
        coordinates: [
          [start.longitude, start.latitude],
          [end.longitude, end.latitude],
        ],
      },
      {
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("ORS Proxy Error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      message: "Error fetching directions from OpenRouteService",
      error: error.response?.data || error.message,
    });
  }
});

export default router;
