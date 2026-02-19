import express from "express";
import db from "../firebase.js";
import { model } from "../gemini.js";

const router = express.Router();

// POST /feedback/generate
router.post("/generate", async (req, res) => {
    try {
        const { interviewId } = req.body;

        if (!interviewId) {
            return res.status(400).json({ error: "Missing interviewId" });
        }

        // 🔹 1. Firebase se messages fetch karo
        let snapshot;
        try {
            snapshot = await db
                .collection("interviews")
                .doc(interviewId)
                .collection("messages")
                .orderBy("createdAt")
                .get();
        } catch (orderByError) {
            // If orderBy fails (no index), try without ordering
            console.warn("orderBy failed, fetching without order:", orderByError.message);
            snapshot = await db
                .collection("interviews")
                .doc(interviewId)
                .collection("messages")
                .get();
        }

        if (snapshot.empty) {
            return res.status(404).json({ error: "No messages found for this interview" });
        }

        // 🔹 2. Transcript banao (sort by createdAt if available)
        const messages = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            messages.push({
                ...data,
                createdAt: data.createdAt?.toMillis?.() || data.createdAt?.getTime?.() || 0
            });
        });

        // Sort by createdAt if available
        messages.sort((a, b) => a.createdAt - b.createdAt);

        let transcript = "";
        messages.forEach((data) => {
            transcript += `${data.role?.toUpperCase() || "UNKNOWN"}: ${data.text || ""}\n`;
        });

        if (!transcript.trim()) {
            return res.status(400).json({ error: "Empty transcript - no valid messages found" });
        }

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

        // 🔹 4. Firebase me save karo (use set with merge instead of update)
        await db.collection("interviews").doc(interviewId).set({
            feedback,
            feedbackGeneratedAt: new Date(),
        }, { merge: true });

        res.json({ feedback });

    } catch (err) {
        console.error("Feedback Error:", err);
        console.error("Error details:", {
            message: err.message,
            stack: err.stack,
            code: err.code
        });
        res.status(500).json({ 
            error: "Failed to generate feedback",
            details: err.message 
        });
    }
});

export default router;
