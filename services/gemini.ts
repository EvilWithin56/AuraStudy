import { GoogleGenAI, Type } from "@google/genai";

// Initialize AI with the key from process.env as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to clean AI response text (removes markdown code blocks)
const cleanJson = (text: string | undefined): string => {
  if (!text) return "[]";
  // Remove ```json, ```, and trim whitespace
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

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
    
    // Robust parsing
    const cleanText = response.text ? response.text.replace(/```json/g, '').replace(/```/g, '').trim() : "{}";
    const result = JSON.parse(cleanText);
    
    return {
      themeId: result.themeId || 'forest',
      soundId: result.soundId || 'lofi',
      reasoning: result.reasoning || 'Standard focus setup.'
    };
  } catch (error) {
    console.warn("Smart Aura fallback used due to error:", error);
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
    return JSON.parse(cleanJson(response.text));
  } catch (error) {
    return [];
  }
}

export async function generateSubtasks(goal: string): Promise<string[]> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Act as a productivity expert. Break down the user's goal: '${goal}' into 3-5 actionable, concise sub-tasks that can each be completed in 25 minutes (Pomodoro style). Return ONLY a raw JSON array of strings, e.g., ['Task 1', 'Task 2']. No markdown, no extra text.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(cleanJson(response.text));
  } catch (error) {
    console.error("AI Task Breakdown Failed:", error);
    return [goal]; // Fallback to original
  }
}