import { GoogleGenAI, Type } from "@google/genai";
import { RoadmapDay } from "../types";

// NOTE: process.env.API_KEY is handled by the build environment/runtime.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateRoadmap = async (
  goal: string,
  duration: number
): Promise<RoadmapDay[]> => {
  try {
    const prompt = `
      Create a linear, day-by-day roadmap for the following goal: "${goal}".
      The duration is strictly ${duration} days.
      
      For each day, provide:
      1. A short title for the day's focus.
      2. A scope list (3-5 bullet points) of specific sub-tasks or concepts to cover.
      
      The output must be a strict JSON array.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              day: { type: Type.INTEGER },
              title: { type: Type.STRING },
              scope: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["day", "title", "scope"]
          }
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return data as RoadmapDay[];
    }
    
    throw new Error("No data returned from Gemini");
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};