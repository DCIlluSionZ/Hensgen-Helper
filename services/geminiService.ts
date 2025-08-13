
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

if (!process.env.API_KEY) {
  console.warn("Gemini API key not found. AI features will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
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
  if (!process.env.API_KEY) {
    throw new Error("API key is not configured.");
  }

  const model = 'gemini-2.5-flash';
  const prompt = `You are an expert at valuing second-hand items for the Melbourne, Australia market. Analyse this image and provide:
- A likely name for the item.
- 2-3 bullet points about its apparent condition from the photo.
- An estimated price range in AUD for selling on Gumtree, Facebook Marketplace, or eBay.
- One concise, actionable tip for selling this item.
Format your response in simple markdown.`;
  
  const [header, base64Data] = imageDataUrl.split(",");
  const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const imagePart = fileToGenerativePart(base64Data, mimeType);

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: { parts: [imagePart, { text: prompt }] },
    });
    return response.text;
  } catch (error) {
    console.error("Error generating valuation:", error);
    throw new Error("Failed to get valuation from AI. Please try again.");
  }
};


export const getChatResponse = async (history: { role: 'user' | 'model', parts: { text: string }[] }[], newMessage: string): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API key is not configured.");
    }
    
    if (!chat) {
        chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: "You are an Aussie market seller coach. You provide friendly, straightforward advice on how to sell second-hand goods in Australia. Keep your tone encouraging and your tips practical. Use Australian slang where appropriate, mate.",
            },
            history,
        });
    }

    try {
        const response: GenerateContentResponse = await chat.sendMessage({ message: newMessage });
        return response.text;
    } catch (error) {
        console.error("Error getting chat response:", error);
        throw new Error("Couldn't get a response. The AI might be having a smoko. Try again later.");
    }
};

