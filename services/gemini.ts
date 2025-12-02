import { GoogleGenAI } from "@google/genai";

// Initialize the client with the API key from the environment
// The prompt ensures process.env.API_KEY is available.
export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Example helper function to demonstrate usage pattern
export const generateText = async (prompt: string, model: string = 'gemini-2.5-flash') => {
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};