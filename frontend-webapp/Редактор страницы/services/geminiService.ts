
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const suggestContent = async (currentContent: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are an expert curriculum designer. Continue writing the following lesson based on the current text. Provide exactly two more paragraphs in plain HTML format (only <p> and <ul> tags). Keep the tone professional yet engaging.\n\nContext: ${currentContent}`,
      config: {
        temperature: 0.7,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Assistant Error:", error);
    return null;
  }
};
