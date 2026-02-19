import express from "express";
import fetch from "node-fetch";
const router = express.Router();
router.post("/call", async (req, res) => {
  try {
    const response = await fetch("https://api.vapi.ai/call/web", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.VAPI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).send("VAPI call failed");
  }
});
export default router;