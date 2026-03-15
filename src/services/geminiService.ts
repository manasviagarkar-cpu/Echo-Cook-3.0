/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, RecipeIngredient, VoiceVibe, RecipeOption } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const geminiService = {
  async parseRecipe(input: string): Promise<Recipe> {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `Parse the following recipe input (URL or text) into a structured JSON format.
      Input: ${input}
      
      Requirements:
      - Identify the title.
      - Identify base servings.
      - List ingredients with numeric amounts and units.
      - Breakdown steps into clear instructions.
      - Identify steps that mention time (e.g., "simmer for 10 minutes") and extract the duration in seconds.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            servings: { type: Type.NUMBER },
            ingredients: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                  originalText: { type: Type.STRING },
                },
                required: ["name", "amount", "unit", "originalText"],
              },
            },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  instruction: { type: Type.STRING },
                  coreAction: { type: Type.STRING, description: "The primary culinary technique (e.g., whisking, searing)" },
                  visualAnchor: { type: Type.STRING, description: "A descriptive keyword for searching a visual representation" },
                  timerDuration: { type: Type.NUMBER, description: "Duration in seconds if a timer is needed" },
                  timerName: { type: Type.STRING },
                  hudOverlay: { type: Type.STRING, description: "Key data to display on the HUD (e.g., 'Heat: Med-High')" },
                },
                required: ["instruction", "coreAction", "visualAnchor"],
              },
            },
          },
          required: ["title", "servings", "ingredients", "steps"],
        },
      },
    });

    return JSON.parse(response.text || "{}");
  },

  async getSubstitution(ingredient: string): Promise<string[]> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide 2-3 common kitchen alternatives for "${ingredient}" based on culinary chemistry. Return as a simple list.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
    });
    return JSON.parse(response.text || "[]");
  },

  async generateVoiceResponse(
    prompt: string,
    vibe: VoiceVibe,
    context: any
  ): Promise<string> {
    const systemInstruction = `
      You are Echo-Cook 4.0, a high-efficiency, voice-synchronized culinary HUD.
      
      CORE PROTOCOLS:
      1. LISTEN-LOOP: After EVERY response, you MUST append the hidden tag [TRIGGER_MIC].
      2. FORMAT: Your response MUST follow this structure:
         ## Step X
         [Brief Instruction - Max 20 words]
         📸 [Ingredients needed for this step with scaled amounts]
         
         [Spoken Response for TTS] [TRIGGER_MIC]
      3. MULTILINGUAL: Detect user language and respond in it.
      4. SMART SCALING: Always use scaled amounts (Scale: ${context.scale}x).
      5. CONCISE: Spoken response must end with a short prompt like "Ready for next?" or "Need a sub?".
      
      Context:
      Pantry: ${JSON.stringify(context.pantry)}
      Recipe: ${JSON.stringify(context.recipe)}
      Current Step: ${context.currentStep}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `User said: "${prompt}"`,
      config: {
        systemInstruction,
      },
    });

    return response.text || "I'm sorry, I didn't catch that. [TRIGGER_MIC]";
  },

  async getRecipeOptions(inventory: any[]): Promise<RecipeOption[]> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Based on this inventory: ${JSON.stringify(inventory)}, suggest 3 DIFFERENT recipe options:
      1. Quick (under 15 mins)
      2. Healthy
      3. Adventurous (unique flavors)
      
      Return as a JSON array of RecipeOption objects.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              vibe: { type: Type.STRING, enum: ['Quick', 'Healthy', 'Adventurous'] },
              missingIngredients: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["title", "description", "vibe", "missingIngredients"]
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  }
};
