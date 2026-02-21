import express from "express";
import cors from "cors";
import resumeRoute from "./routes/resume.js";
import interviewRoutes from "./routes/interview.js";
import conversationRoutes from "./routes/conversationRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";

import dotenv from "dotenv";
dotenv.config();

const app = express();
console.log("ENV CHECK:");
console.log("VAPI:", process.env.VAPI_PRIVATE_KEY ? "OK" : "Missing");
console.log("OPENAI:", process.env.OPENAI_API_KEY ? "OK" : "Missing");

app.use(cors());
app.use(express.json());
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'AI Interview API is running',
    endpoints: {
      resume: '/resume',
      interview: '/interview',
      conversation: '/conversation',
      feedback: '/feedback'
    }
  });
});

// log every request (debug)
app.use((req, res, next) => {
  console.log("Incoming:", req.method, req.url);
  next();
});
app.use("/resume", resumeRoute);
app.use("/interview", interviewRoutes);
app.use("/conversation", conversationRoutes); 
app.use("/feedback", feedbackRoutes);

// global error handler
app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);
  res.status(500).send("Something broke!");
});
app.listen(5001, () => {
  console.log("Server running on port 5001");
});
