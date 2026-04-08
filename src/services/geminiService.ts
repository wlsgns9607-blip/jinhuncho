import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const geminiModel = "gemini-3-flash-preview";

export async function getLogFeedback(title: string, content: string) {
  const prompt = `
    초등학생이 작성한 생물 관찰 일지입니다.
    제목: ${title}
    내용: ${content}
    
    이 일지를 읽고 학생에게 따뜻한 칭찬과 관찰력을 높일 수 있는 조언을 한 문장씩 제공해주세요.
    어린이의 눈높이에 맞춰 친절하고 격려하는 말투를 사용하세요.
    응답은 JSON 형식으로 주세요: { "praise": "칭찬 내용", "advice": "조언 내용" }
  `;

  try {
    const response = await ai.models.generateContent({
      model: geminiModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            praise: { type: Type.STRING },
            advice: { type: Type.STRING }
          },
          required: ["praise", "advice"]
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Feedback Error:", error);
    return { praise: "정말 멋진 관찰이에요!", advice: "다음에는 생물의 색깔이나 모양을 더 자세히 관찰해볼까요?" };
  }
}

export async function chatWithBioDoctor(history: { role: string, parts: { text: string }[] }[], question: string) {
  const chat = ai.chats.create({
    model: geminiModel,
    config: {
      systemInstruction: "당신은 'AI 생물박사'입니다. 초등학생들의 질문에 친절하고 과학적으로 답변해주는 전문가입니다. 어린이들이 이해하기 쉬운 용어를 사용하고, 호기심을 자극하는 답변을 해주세요."
    },
    history: history
  });

  try {
    const result = await chat.sendMessage({ message: question });
    return result.text;
  } catch (error) {
    console.error("Bio Doctor Chat Error:", error);
    return "미안해요, 지금은 잠시 생각을 정리 중이에요. 다시 질문해 주시겠어요?";
  }
}

export async function identifySpecies(base64Image: string) {
  const prompt = "이 사진 속 생물이 무엇인지 알려주세요. 이름과 함께 특징을 3가지 정도 초등학생이 이해하기 쉽게 설명해주세요. 응답은 JSON 형식으로 주세요: { \"name\": \"생물 이름\", \"description\": \"설명\" }";
  
  try {
    const response = await ai.models.generateContent({
      model: geminiModel,
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "image/jpeg", data: base64Image } }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["name", "description"]
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Identify Species Error:", error);
    return { name: "알 수 없음", description: "사진이 흐리거나 생물을 찾기 어려워요. 다시 찍어볼까요?" };
  }
}

export async function recognizeHandwriting(base64Image: string) {
  const prompt = "이 사진에 적힌 손글씨를 텍스트로 변환해주세요. 관찰 일지 내용인 경우 자연스러운 문장으로 정리해주세요.";
  
  try {
    const response = await ai.models.generateContent({
      model: geminiModel,
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "image/jpeg", data: base64Image } }
        ]
      }
    });
    return response.text;
  } catch (error) {
    console.error("Handwriting Recognition Error:", error);
    return "손글씨를 인식하는 데 실패했습니다. 다시 시도해 주세요.";
  }
}
