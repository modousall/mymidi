import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY!
);

// This is a v1 model
export const geminiModel = genAI.getGenerativeModel({
  model: "models/gemini-1.5-flash",
});
