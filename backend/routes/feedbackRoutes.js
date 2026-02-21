import express from "express";
import { admin } from "../firebase.js";  // Change 1: import { admin } instead of db
import { model } from "../gemini.js";

const router = express.Router();
const db = admin.firestore();  // Change 2: Add this line

// POST /feedback/generate
router.post("/generate", async (req, res) => {
    try {
        const { interviewId } = req.body;

        if (!interviewId) {
            return res.status(400).json({ error: "Missing interviewId" });
        }

        // 🔹 1. Firebase se messages fetch karo
        const snapshot = await db
            .collection("interviews")
            .doc(interviewId)
            .collection("messages")
            .orderBy("createdAt")
            .get();

        if (snapshot.empty) {
            return res.status(404).json({ error: "No messages found" });
        }

        // 🔹 2. Transcript banao
        let transcript = "";

        snapshot.forEach((doc) => {
            const data = doc.data();
            transcript += `${data.role.toUpperCase()}: ${data.text}\n`;
        });

        console.log("Transcript sent to Gemini:\n", transcript);

        // 🔹 3. Gemini ko bhejo
        const result = await model.generateContent(`
You are a senior technical interviewer evaluating a candidate.

Analyze the interview conversation and return a professional report.

Format EXACTLY like this:

Overall Score: (out of 10)

Strengths:
- point

Weaknesses:
- point

Communication Skills:
(short evaluation)

Technical Understanding:
(short evaluation)

Final Recommendation:
(Hire / No Hire / Needs Improvement)

Interview Transcript:
${transcript}
`);

        const feedback = result.response.text();

        console.log("Feedback Generated:\n", feedback);

        // 🔹 4. Firebase me save karo
        await db.collection("interviews").doc(interviewId).update({
            feedback,
            feedbackGeneratedAt: new Date(),
        });

        res.json({ feedback });

    } catch (err) {
        console.error("Feedback Error:", err);
        res.status(500).json({ error: "Failed to generate feedback" });
    }
});

export default router;
