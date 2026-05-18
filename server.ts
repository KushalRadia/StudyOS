import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

app.use(express.json({ limit: '50mb' }));

// API Routes
app.post("/api/gemini/generate", async (req, res) => {
  try {
    const { prompt, model: modelName } = req.body;
    const response = await ai.models.generateContent({
      model: modelName || "gemini-1.5-flash",
      contents: prompt,
    });
    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/gemini/multimodal", async (req, res) => {
  try {
    const { prompt, fileData, mimeType, model: modelName } = req.body;
    const response = await ai.models.generateContent({
      model: modelName || "gemini-1.5-flash",
      contents: {
        parts: [
          { inlineData: { data: fileData, mimeType } },
          { text: prompt }
        ]
      },
    });
    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini Multimodal Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { history, model: modelName } = req.body;
    const chat = ai.chats.create({
      model: modelName || "gemini-1.5-flash",
      history: history.slice(0, -1), // all but last message
    });
    const lastMessage = history[history.length - 1];
    const response = await chat.sendMessage({ message: lastMessage.parts[0].text });
    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
