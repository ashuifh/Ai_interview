import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// gemini-1.5-* models are deprecated; use 2.x
export const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});
