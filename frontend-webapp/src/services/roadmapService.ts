
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface SchoolData {
    name: string;
    teachingGoal: string;
}

export interface RoadmapStep {
    title: string;
    description: string;
    tasks: string[];
}

export interface AIResponse {
    curriculum: RoadmapStep[];
    successMessage: string;
}

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function generateSchoolRoadmap(data: SchoolData): Promise<AIResponse> {
    const prompt = `Act as an expert community builder and educator. Based on the following information, generate a professional school launch roadmap.
  School Name: ${data.name}
  What they will teach: ${data.teachingGoal}
  
  Please provide a structured curriculum with 4 key steps/milestones. For each milestone, provide a title, a brief description, and 3 actionable tasks.
  Return the response in JSON format matching this schema:
  {
    "successMessage": "motivational welcome message",
    "curriculum": [
      {
        "title": "step title",
        "description": "step description",
        "tasks": ["task 1", "task 2", "task 3"]
      }
    ]
  }`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        // Clean JSON response from potential markdown wrapping
        const jsonStr = text.replace(/```json|```/g, "").trim();
        return JSON.parse(jsonStr) as AIResponse;
    } catch (err) {
        console.error("Gemini Error:", err);
        throw err;
    }
}
