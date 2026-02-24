import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getLotteryPredictions(type: string, lastResults: any[]) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `Com base nos últimos resultados da loteria "${type}": ${JSON.stringify(lastResults)}. 
  Gere um palpite de números únicos seguindo as regras oficiais desta loteria.
  Explique brevemente o motivo do palpite em português.
  Retorne em formato JSON.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            numbers: {
              type: Type.ARRAY,
              items: { type: Type.INTEGER },
              description: `Lista de ${type === "lotofacil" ? "15" : "6"} números sorteados.`
            },
            reason: {
              type: Type.STRING,
              description: "Explicação do palpite."
            }
          },
          required: ["numbers", "reason"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error generating predictions:", error);
    return null;
  }
}
