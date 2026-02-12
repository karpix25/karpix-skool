
import { GoogleGenAI } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateCourseSuggestions = async (prompt: string, type: 'title' | 'description') => {
  const ai = getAI();
  const systemPrompt = type === 'title' 
    ? "You are a marketing expert. Generate 3 catchy, professional course titles based on the user's idea. Keep them under 50 characters."
    : "You are an educational content writer. Generate a concise, engaging course description (max 200 characters) that explains learning outcomes.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });
    return response.text || "No suggestion generated.";
  } catch (error) {
    console.error("AI Generation failed:", error);
    return "Error generating suggestion.";
  }
};
