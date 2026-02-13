
import { GoogleGenAI, Type } from "@google/genai";
import { SchoolData, AIResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateSchoolRoadmap(data: SchoolData): Promise<AIResponse> {
  const prompt = `Act as an expert community builder and educator. Based on the following information, generate a professional school launch roadmap.
  School Name: ${data.name}
  What they will teach: ${data.teachingGoal}
  
  Please provide a structured curriculum with 4 key steps/milestones. For each milestone, provide a title, a brief description, and 3 actionable tasks.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          successMessage: {
            type: Type.STRING,
            description: "A motivational welcome message for the user."
          },
          curriculum: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                tasks: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["title", "description", "tasks"]
            }
          }
        },
        required: ["successMessage", "curriculum"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Empty response from AI");
  return JSON.parse(text) as AIResponse;
}
