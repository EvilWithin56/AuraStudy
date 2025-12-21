
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function fetchMotivationalQuote(): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Give me one short, deeply inspiring and aesthetic motivational quote for a student. Max 12 words.",
      config: { temperature: 0.9 },
    });
    return response.text?.replace(/"/g, '') || "Your potential is endless.";
  } catch (error) {
    return "Focus on the journey, not the destination.";
  }
}

export async function generateFocusRitual(intent: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User wants to focus on: "${intent}". Give a 2-sentence "Study Ritual" or technique to master this. Be concise and high-level.`,
      config: { temperature: 0.7 },
    });
    return response.text || "Break the task into three micro-goals and start with the hardest one first.";
  } catch (error) {
    return "Eliminate all distractions and commit to 25 minutes of deep work.";
  }
}

export async function suggestSmartAura(prompt: string): Promise<{ themeId: string; soundId: string; reasoning: string }> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Based on this focus goal or mood: "${prompt}", suggest the best atmosphere. 
      Available Themes: forest, mountain, ocean, space, city, cyber, zen, attic, aurora.
      Available Sounds: rain, lofi, fire, forest, waves, classical, jazz.
      Return the choice in JSON format.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            themeId: { type: Type.STRING },
            soundId: { type: Type.STRING },
            reasoning: { type: Type.STRING }
          },
          required: ["themeId", "soundId", "reasoning"]
        }
      }
    });
    const result = JSON.parse(response.text || "{}");
    return {
      themeId: result.themeId || 'forest',
      soundId: result.soundId || 'lofi',
      reasoning: result.reasoning || 'Standard focus setup.'
    };
  } catch (error) {
    return { themeId: 'forest', soundId: 'lofi', reasoning: 'Falling back to default focus aura.' };
  }
}

export async function suggestTasks(intent: string): Promise<string[]> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `The user's goal is: "${intent}". Suggest 4-5 short, actionable sub-tasks or milestones to achieve this during a deep work session. Return as a JSON array of strings.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    return [];
  }
}
