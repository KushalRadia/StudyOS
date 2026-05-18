// Client-side utility for the server proxy API

export async function callGemini(
  prompt: string,
  options: { model?: string; languageInstruction?: string } = {},
) {
  const fullPrompt = options.languageInstruction 
    ? prompt + options.languageInstruction 
    : prompt;
  const response = await fetch("/api/gemini/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: fullPrompt,
      model: options.model || "gemini-2.5-flash",
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to fetch from Gemini API");
  }

  const data = await response.json();
  return data.text;
}

export async function callGeminiWithFile(
  prompt: string,
  fileData: string,
  mimeType: string,
  options: { model?: string; languageInstruction?: string } = {},
) {
  const fullPrompt = options.languageInstruction 
    ? prompt + options.languageInstruction 
    : prompt;
  const response = await fetch("/api/gemini/multimodal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: fullPrompt,
      fileData,
      mimeType,
      model: options.model || "gemini-2.5-flash",
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to fetch from Gemini API");
  }

  const data = await response.json();
  return data.text;
}

export async function callGeminiChat(history: any[], newMessage: string) {
  const fullHistory = [
    ...history,
    { role: "user", parts: [{ text: newMessage }] }
  ];
  const response = await fetch("/api/gemini/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ history: fullHistory }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to fetch from Gemini API");
  }
  const data = await response.json();
  return data.text;
}

export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function parseGeminiJson(text: string) {
  try {
    const cleaned = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Failed to parse Gemini JSON:", text);
    throw new Error("Invalid response format from AI");
  }
}
