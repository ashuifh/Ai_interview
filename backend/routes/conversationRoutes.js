import express from "express";
import { admin } from "../firebase.js";  // Yahan change kiya

const router = express.Router();
const db = admin.firestore();  // Ye line add karo

// SAVE conversation message
router.post("/save", async (req, res) => {
  try {
    const { interviewId, role, text } = req.body;

    if (!interviewId || !text) {
      return res.status(400).json({ error: "Missing data" });
    }

    await db
      .collection("interviews")
      .doc(interviewId)
      .collection("messages")
      .add({
        role: role || "user",
        text,
        createdAt: new Date(),
      });

    res.json({ success: true });
  } catch (err) {
    console.error("Firestore Save Error:", err);
    res.status(500).json({ error: "Failed to save message" });
  }
});

export default router;
