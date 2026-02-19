import express from "express";
import db from "../firebase.js";

const router = express.Router();

// SAVE conversation message
router.post("/save", async (req, res) => {
  try {
    const { interviewId, role, text } = req.body;

    if (!interviewId || !text) {
      return res.status(400).json({ error: "Missing data" });
    }

    // Ensure parent interview document exists
    const interviewRef = db.collection("interviews").doc(interviewId);
    const interviewDoc = await interviewRef.get();
    
    if (!interviewDoc.exists) {
      // Create interview document if it doesn't exist
      await interviewRef.set({
        createdAt: new Date(),
        status: "in-progress"
      }, { merge: true });
    }

    // Save message to subcollection
    await interviewRef
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
