import mongoose from "mongoose";
const InterviewConversationSchema = new mongoose.Schema({
  sessionId: String,     // ek interview ki unique id
  role: String,          // assistant | user
  message: String,       // actual text
  time: Date
});
export default mongoose.model(
  "InterviewConversation",
  InterviewConversationSchema
);