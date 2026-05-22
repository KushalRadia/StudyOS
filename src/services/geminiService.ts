// Client-side utility for the server proxy API

export async function callGemini(
  prompt: string,
  options: { model?: string; languageInstruction?: string; config?: any } = {},
) {
  const fullPrompt = options.languageInstruction 
    ? prompt + options.languageInstruction 
    : prompt;
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";
  const response = await fetch(`${BACKEND_URL}/api/gemini/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: fullPrompt,
      model: options.model || "gemini-2.5-flash",
      config: options.config,
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
  options: { model?: string; languageInstruction?: string; config?: any } = {},
) {
  const fullPrompt = options.languageInstruction 
    ? prompt + options.languageInstruction 
    : prompt;
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";
  const response = await fetch(`${BACKEND_URL}/api/gemini/multimodal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: fullPrompt,
      fileData,
      mimeType,
      model: options.model || "gemini-2.5-flash",
      config: options.config,
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
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";
  const response = await fetch(`${BACKEND_URL}/api/gemini/chat`, {
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
  if (!text) {
    throw new Error("Empty response from AI");
  }
  
  // 1. Try standard direct parsing
  try {
    return JSON.parse(text);
  } catch {
    // 2. Try removing markdown markers
    try {
      const cleaned = text.replace(/```json|```/g, "").trim();
      return JSON.parse(cleaned);
    } catch {
      // 3. Robust substring extraction (find first '{' or '[' and match to last '}' or ']')
      const firstCurly = text.indexOf("{");
      const lastCurly = text.lastIndexOf("}");
      const firstSquare = text.indexOf("[");
      const lastSquare = text.lastIndexOf("]");
      
      let start = -1;
      let end = -1;
      
      if (firstCurly !== -1 && (firstSquare === -1 || firstCurly < firstSquare)) {
        start = firstCurly;
        end = lastCurly;
      } else if (firstSquare !== -1) {
        start = firstSquare;
        end = lastSquare;
      }
      
      if (start !== -1 && end !== -1 && end > start) {
        try {
          const jsonSubstring = text.substring(start, end + 1);
          return JSON.parse(jsonSubstring);
        } catch (subError) {
          console.error("Failed parsing extracted JSON substring:", text, subError);
        }
      }
      
      console.error("Failed to parse Gemini JSON:", text);
      throw new Error("Invalid response format from AI");
    }
  }
}
