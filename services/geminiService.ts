import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("Missing VITE_GEMINI_API_KEY. Create a .env.local file at the project root with VITE_GEMINI_API_KEY=your-key");
}

const PRIMARY_MODEL = 'gemini-3.5-flash';
const FALLBACK_MODEL = 'gemini-3.1-flash-lite';

const ai = new GoogleGenAI({ apiKey: API_KEY });
let currentModel: string = PRIMARY_MODEL;
let chat: Chat | null = null;

const isQuotaError = (err: any): boolean => {
  const msg = ((err?.message || '') + ' ' + (err?.status || '')).toLowerCase();
  return msg.includes('quota') || msg.includes('429') || msg.includes('exhausted') || msg.includes('billing');
};

// On a quota error, step down to the cheaper Flash-Lite model for the rest of the session.
// Returns true if a fallback is available to try, false if already on it.
const stepDownModel = (): boolean => {
  if (currentModel === PRIMARY_MODEL) {
    console.warn(`Gemini quota hit on ${PRIMARY_MODEL} — falling back to ${FALLBACK_MODEL}`);
    currentModel = FALLBACK_MODEL;
    chat = null;
    return true;
  }
  return false;
};

function fileToGenerativePart(base64Data: string, mimeType: string) {
  return {
    inlineData: {
      data: base64Data,
      mimeType,
    },
  };
}

export const generateValuation = async (imageDataUrl: string): Promise<string> => {
  const prompt = `You are an expert at valuing second-hand items for the Melbourne, Australia market, especially Sunday markets, Gumtree, Facebook Marketplace, and eBay AU. Analyse this image and provide:
- A likely name for the item.
- 2-3 bullet points about its apparent condition from the photo.
- An estimated price range in AUD for selling second-hand.
- One concise, actionable tip for selling this item quickly.
Format your response in simple markdown.`;

  const [header, base64Data] = imageDataUrl.split(",");
  const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const imagePart = fileToGenerativePart(base64Data, mimeType);

  const call = () => ai.models.generateContent({
    model: currentModel,
    contents: { parts: [imagePart, { text: prompt }] },
  });

  try {
    const response: GenerateContentResponse = await call();
    return response.text ?? 'No response from AI.';
  } catch (error) {
    if (isQuotaError(error) && stepDownModel()) {
      try {
        const response: GenerateContentResponse = await call();
        return response.text ?? 'No response from AI.';
      } catch (retryError) {
        console.error("Error generating valuation (fallback):", retryError);
        throw new Error("AI is busy right now (daily limit reached). Please try again later.");
      }
    }
    console.error("Error generating valuation:", error);
    throw new Error("Failed to get valuation from AI. Please try again.");
  }
};


export const resetChat = () => { chat = null; };

export const getChatResponse = async (history: { role: 'user' | 'model', parts: { text: string }[] }[], newMessage: string): Promise<string> => {
    const startChat = () => ai.chats.create({
        model: currentModel,
        config: {
            systemInstruction: "You are 'Hensgen Helper', a friendly AI assistant for Adrian, a master builder in Melbourne who sells second-hand items at Sunday markets. He's experienced but not tech-savvy. Give him practical, straightforward advice on selling, pricing, and building. Keep answers clear and concise. Use Australian English.",
        },
        history,
    });

    if (!chat) chat = startChat();

    try {
        const response: GenerateContentResponse = await chat.sendMessage({ message: newMessage });
        return response.text ?? 'No response from AI.';
    } catch (error: any) {
        if (isQuotaError(error) && stepDownModel()) {
            try {
                chat = startChat();
                const response: GenerateContentResponse = await chat.sendMessage({ message: newMessage });
                return response.text ?? 'No response from AI.';
            } catch (retryError: any) {
                console.error("Error getting chat response (fallback):", retryError);
                chat = null;
                throw new Error("AI is busy right now (daily limit reached). Please try again later.");
            }
        }
        console.error("Error getting chat response:", error);
        chat = null;
        const msg = error?.message || '';
        if (msg.includes('API key')) throw new Error("API key error. Please check your Gemini API key is valid.");
        if (msg.includes('404') || msg.includes('not found')) throw new Error("Model not available. Please check your API key has access to Gemini Flash.");
        if (msg.includes('network') || msg.includes('Failed to fetch')) throw new Error("No internet connection. Please check your network.");
        throw new Error("Couldn't get a response: " + msg);
    }
};
