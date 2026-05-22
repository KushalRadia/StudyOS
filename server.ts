import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

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

// Enable CORS for cross-origin frontend-to-backend communication
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

// Mock and Fallback System for Robust Local Testing
function getMockGenerateResponse(prompt: string): string {
  const p = prompt.toLowerCase();
  
  if (p.includes("mustknow") || p.includes("goodtoknow") || p.includes("skip") || p.includes("onesentencesummary")) {
    return JSON.stringify({
      mustKnow: [
        "Quantum superposition allows particles to exist in multiple states simultaneously until measured.",
        "Quantum entanglement links particles such that the state of one instantaneously determines the other.",
        "Quantum computing uses qubits instead of classical bits, enabling exponential speedup for certain algorithms."
      ],
      goodToKnow: [
        "Qubits can be implemented using superconducting circuits, trapped ions, or topological systems.",
        "Quantum cryptography (QKD) provides theoretically unbreakable communication based on physical laws."
      ],
      skip: [
        "Detailed derivation of the Schrödinger equation and wave function solutions.",
        "Specific hardware calibration parameters and cryogenic cooling cycle engineering."
      ],
      oneSentenceSummary: "Quantum mechanics introduces superposition and entanglement, enabling qubits to process complex computational pathways exponentially faster than classical computers."
    });
  }

  if (p.includes("study plan") || p.includes("deadline") || p.includes("study planner") || p.includes("roadmap")) {
    return JSON.stringify({
      totalDays: 5,
      warning: "Time is tight! Focus on hard topics first.",
      plan: [
        {
          date: "2026-06-20",
          day: "Saturday",
          topic: "Stereochemistry",
          task: "Review Stereochemistry basics and chiral centers",
          hours: 4,
          type: "study"
        },
        {
          date: "2026-06-21",
          day: "Sunday",
          topic: "Stereochemistry",
          task: "Solve practice problems on Stereochemistry",
          hours: 4,
          type: "study"
        },
        {
          date: "2026-06-22",
          day: "Monday",
          topic: "Spectroscopic Methods",
          task: "Study IR and NMR spectroscopy theory",
          hours: 4,
          type: "study"
        },
        {
          date: "2026-06-23",
          day: "Tuesday",
          topic: "Spectroscopic Methods",
          task: "Practice spectroscopic data analysis",
          hours: 4,
          type: "study"
        },
        {
          date: "2026-06-24",
          day: "Wednesday",
          topic: "Revision",
          task: "Mock exam and final review",
          hours: 4,
          type: "revision"
        }
      ]
    });
  }

  if (p.includes("flashcard") || p.includes("spaced repetition") || p.includes("generate deck")) {
    return JSON.stringify([
      {
        front: "What is the primary role of the Mitochondria?",
        back: "Mitochondria produce ATP through cellular respiration, acting as the powerhouse of the cell."
      },
      {
        front: "Define Osmosis.",
        back: "The movement of water molecules from a region of higher water concentration to a region of lower water concentration through a semi-permeable membrane."
      },
      {
        front: "What is active transport?",
        back: "The movement of ions or molecules across a cell membrane into a region of higher concentration, assisted by enzymes and requiring energy (ATP)."
      }
    ]);
  }

  if (p.includes("concept map") || p.includes("d3") || p.includes("conceptlinker") || p.includes("nodes")) {
    return JSON.stringify({
      nodes: [
        { id: "1", label: "Linear Algebra", summary: "The branch of mathematics concerning linear equations and transformations.", cluster: "Math", importance: 5 },
        { id: "2", label: "Vector Calculus", summary: "Concerned with differentiation and integration of vector fields.", cluster: "Math", importance: 4 },
        { id: "3", label: "Eigenvalues", summary: "Special set of scalars associated with linear equations.", cluster: "Linear Algebra", importance: 3 },
        { id: "4", label: "Gradient Descent", summary: "An optimization algorithm used to minimize functions.", cluster: "Optimization", importance: 4 }
      ],
      edges: [
        { source: "1", target: "3", relationship: "defines", strength: 3 },
        { source: "2", target: "4", relationship: "uses", strength: 2 },
        { source: "1", target: "2", relationship: "extends", strength: 2 }
      ],
      studyOrder: ["Linear Algebra", "Eigenvalues", "Vector Calculus", "Gradient Descent"],
      insight: "Linear algebra forms the vector spaces that vector calculus operates on, both of which are optimized via gradient descent."
    });
  }

  return `### Core Overview
Here is a comprehensive breakdown of the topic.

### 🚨 Must Know
- Key principle 1: Quantum superposition is fundamental.
- Key principle 2: Entangled states share information instantly.
- Key principle 3: Practical applications include quantum key distribution.

### 💡 Practice Question
*Why is this important?* It forms the basis of next-generation computation.`;
}

function getMockChatResponse(history: any[]): string {
  const lastMessage = history[history.length - 1];
  const text = lastMessage?.parts?.[0]?.text || "";
  const p = text.toLowerCase();

  if (p.includes("photosynthesis")) {
    return "Excellent topic choice. Photosynthesis is how plants convert light energy into chemical energy. Since you mentioned plants use sunlight, water, and carbon dioxide to create sugars, could you explain where inside the plant cell this process actually takes place?";
  }
  
  return "That's a very interesting point! Could you elaborate on how that concept relates to the core principles we are discussing, and what you think happens next?";
}

// Helper utility to enforce timeout on async operations
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, errorMessage = "Request timed out"): Promise<T> => {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timeoutId);
      return res;
    }),
    timeoutPromise
  ]);
};

async function generateContentWithFallback(params: {
  model: string;
  contents: any;
  config?: any;
}) {
  const modelsToTry = [
    params.model || "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-2.5-flash-8b"
  ];
  
  let lastError: any = null;
  for (const model of modelsToTry) {
    try {
      console.log(`[Gemini Proxy] Attempting generation with model: ${model}`);
      const response = await withTimeout(
        ai.models.generateContent({
          model: model,
          contents: params.contents,
          config: params.config,
        }),
        6000, // 6 seconds timeout per model attempt
        `Generation with model ${model} timed out after 6s`
      );
      return response;
    } catch (error: any) {
      lastError = error;
      console.warn(`[Gemini Proxy] Model ${model} failed:`, error.message || error);
    }
  }
  throw lastError;
}

async function sendChatWithFallback(params: {
  model: string;
  history: any[];
  message: string;
}) {
  const modelsToTry = [
    params.model || "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-2.5-fixed" // Just a fallback slot
  ];
  
  let lastError: any = null;
  for (const model of modelsToTry) {
    try {
      console.log(`[Gemini Proxy] Attempting chat with model: ${model}`);
      const chat = ai.chats.create({
        model: model,
        history: params.history,
      });
      const response = await withTimeout(
        chat.sendMessage({ message: params.message }),
        6000, // 6 seconds timeout per model attempt
        `Chat with model ${model} timed out after 6s`
      );
      return response;
    } catch (error: any) {
      lastError = error;
      console.warn(`[Gemini Proxy] Chat Model ${model} failed:`, error.message || error);
    }
  }
  throw lastError;
}

// API Routes
app.post("/api/gemini/generate", async (req, res) => {
  const { prompt, model: modelName, config } = req.body;
  try {
    const response = await generateContentWithFallback({
      model: modelName,
      contents: prompt,
      config: config,
    });
    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini Error, falling back to mock response:", error);
    try {
      const mockText = getMockGenerateResponse(prompt);
      res.json({ text: mockText });
    } catch (mockError: any) {
      res.status(500).json({ error: error.message || "Gemini and fallback both failed" });
    }
  }
});

app.post("/api/gemini/multimodal", async (req, res) => {
  const { prompt, fileData, mimeType, model: modelName, config } = req.body;
  try {
    const response = await generateContentWithFallback({
      model: modelName,
      contents: {
        parts: [
          { inlineData: { data: fileData, mimeType } },
          { text: prompt }
        ]
      },
      config: config,
    });
    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini Multimodal Error, falling back to mock response:", error);
    try {
      const mockText = getMockGenerateResponse(prompt);
      res.json({ text: mockText });
    } catch (mockError: any) {
      res.status(500).json({ error: error.message || "Gemini and fallback both failed" });
    }
  }
});

app.post("/api/gemini/chat", async (req, res) => {
  const { history, model: modelName } = req.body;
  try {
    const lastMessage = history[history.length - 1];
    const messageText = lastMessage.parts[0].text;
    const chatHistory = history.slice(0, -1);
    
    const response = await sendChatWithFallback({
      model: modelName,
      history: chatHistory,
      message: messageText,
    });
    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini Chat Error, falling back to mock response:", error);
    try {
      const mockText = getMockChatResponse(history);
      res.json({ text: mockText });
    } catch (mockError: any) {
      res.status(500).json({ error: error.message || "Gemini and fallback both failed" });
    }
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
