import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

const API_KEY = "AIzaSyBjn0wSKFMMdBG954KND3qQFep1EvRnL-Q";

const ai = new GoogleGenAI({ apiKey: API_KEY });
let chat: Chat | null = null;

function fileToGenerativePart(base64Data: string, mimeType: string) {
  return {
    inlineData: {
      data: base64Data,
      mimeType,
    },
  };
}

export const generateValuation = async (imageDataUrl: string): Promise<string> => {
  const model = 'gemini-3.5-flash';
  const prompt = `You are an expert at valuing second-hand items for the Melbourne, Australia market, especially Sunday markets, Gumtree, Facebook Marketplace, and eBay AU. Analyse this image and provide:
- A likely name for the item.
- 2-3 bullet points about its apparent condition from the photo.
- An estimated price range in AUD for selling second-hand.
- One concise, actionable tip for selling this item quickly.
Format your response in simple markdown.`;

  const [header, base64Data] = imageDataUrl.split(",");
  const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const imagePart = fileToGenerativePart(base64Data, mimeType);

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: { parts: [imagePart, { text: prompt }] },
    });
    return response.text ?? 'No response from AI.';
  } catch (error) {
    console.error("Error generating valuation:", error);
    throw new Error("Failed to get valuation from AI. Please try again.");
  }
};


export const getChatResponse = async (history: { role: 'user' | 'model', parts: { text: string }[] }[], newMessage: string): Promise<string> => {
    if (!chat) {
        chat = ai.chats.create({
            model: 'gemini-3.5-flash',
            config: {
                systemInstruction: "You are 'Hensgen Helper', a friendly AI assistant for Adrian, a master builder in Melbourne who sells second-hand items at Sunday markets. He's experienced but not tech-savvy. Give him practical, straightforward advice on selling, pricing, and building. Keep answers clear and concise. Use Australian English.",
            },
            history,
        });
    }

    try {
        const response: GenerateContentResponse = await chat.sendMessage({ message: newMessage });
        return response.text ?? 'No response from AI.';
    } catch (error) {
        console.error("Error getting chat response:", error);
        throw new Error("Couldn't get a response. Try again in a moment.");
    }
};
