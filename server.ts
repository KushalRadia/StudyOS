import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Groq } from "groq-sdk";
import { createRequire } from "module";
import dotenv from "dotenv";

const require = createRequire(import.meta.url);
const { PDFParse: pdf } = require("pdf-parse");

dotenv.config({ override: true });

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Initialize Groq
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "",
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
  
  if (p.includes("extract every question") || p.includes("pyqsolver") || p.includes("pyq solver")) {
    return JSON.stringify({
      subject: "JEE Advanced Physics",
      examYear: "2025",
      totalQuestions: 1,
      questions: [
        {
          number: "Q1",
          question: "A block of mass m is placed on a rough wedge of inclination theta. Calculate the minimum coefficient of static friction to prevent slipping.",
          marks: 5,
          topic: "Mechanics",
          modelAnswer: "For the block to remain stationary: mg*sin(theta) = f <= mu*N. Since N = mg*cos(theta), mg*sin(theta) <= mu*mg*cos(theta). Dividing both sides gives mu >= tan(theta). Thus, the minimum coefficient of static friction is tan(theta).",
          keyTerms: ["friction", "equilibrium", "coefficient of static friction"],
          likelyToRepeat: true,
          repeatReason: "Wedge friction problems are highly fundamental and repeat annually in varying configurations."
        }
      ]
    });
  }

  if (p.includes("digest this lecture") || p.includes("lecturedigest") || p.includes("lecture digest") || p.includes("lecture note-taker")) {
    return JSON.stringify({
      detectedSubject: "Neurobiology",
      keyConcepts: [
        { concept: "Synaptic Plasticity", explanation: "The ability of synapses to strengthen or weaken over time in response to increases or decreases in their activity." }
      ],
      structuredNotes: "### Overview of Synaptic Plasticity\n\n- Synaptic plasticity is critical for learning and memory formation.\n- It involves long-term potentiation (LTP) and long-term depression (LTD).\n\n### LTP Mechanisms\n- High frequency stimulation leads to increased calcium influx via NMDA receptors.\n- This recruits additional AMPA receptors to the postsynaptic membrane.",
      examWatch: [
        "The distinction between AMPA and NMDA receptor activation pathways is a common exam essay topic."
      ],
      summary: "This lecture covers the fundamental molecular mechanisms of synaptic plasticity, highlighting LTP and LTD pathways."
    });
  }

  if (p.includes("photographed this question") || p.includes("snapsolve") || p.includes("snap & solve")) {
    return JSON.stringify({
      question: "What is the force required to accelerate a 5kg mass at 3m/s^2?",
      correctAnswer: "Using Newton's Second Law: F = m * a. Given m = 5kg and a = 3m/s^2, F = 5kg * 3m/s^2 = 15 Newtons.",
      keySteps: [
        "Identify the formula to use: Newton's Second Law, F = ma",
        "Substitute the given mass (5kg) and acceleration (3m/s^2)",
        "Calculate the final product to get 15 Newtons"
      ],
      subject: "Newtonian Physics",
      mistakeAnalysis: {
        whatWentWrong: "You multiplied the mass and acceleration incorrectly or used the wrong formula.",
        gapIdentified: "Newton's Second Law formula application",
        howToFix: "Memorize F = ma and practice simple multiplication steps."
      },
      similarQuestion: "Calculate the force on a 10kg object accelerating at 2m/s^2."
    });
  }

  if (p.includes("exam post-mortem") || p.includes("examautopsy") || p.includes("exam autopsy")) {
    return JSON.stringify({
      subject: "Mathematics",
      totalQuestions: 1,
      mistakes: [
        {
          questionNumber: "Q1",
          questionText: "Solve for x: 2(x + 5) = 14",
          studentAnswer: "x = 5",
          correctAnswer: "x = 2",
          mistakeType: "Calculation",
          whatWentWrong: "The student expanded 2(x + 5) as 2x + 5 instead of 2x + 10.",
          rootGap: "Distributive Property",
          fix: "Remember to distribute the outer term to ALL terms inside the parentheses.",
          severity: "moderate"
        }
      ],
      dominantMistakeType: "Calculation",
      severityScore: 30,
      overallSummary: "The student understands the basic equation structure but made an algebraic expansion error due to the distributive property."
    });
  }

  if (p.includes("writing coach") || p.includes("writeunblock") || p.includes("unblock")) {
    return JSON.stringify({
      firstSentence: "The digital landscape has fundamentally altered the social fabric of adolescent development, transforming peer interactions from physical presence to persistent connection.",
      angles: [
        { angle: "Dopaminergic Feedback Loops", hint: "Explore how notifications trigger intermittent reward pathways similar to slot machines." },
        { angle: "Constructed Identities", hint: "Analyze the psychological toll of curating a perfect online persona vs. real life." }
      ],
      surprise: {
        example: "The 'displacement hypothesis' which suggests screen time hurts sleep quality more than actual social relationships.",
        why: "This challenges the assumption that content is the only harmful factor, shifting focus to sleep hygiene."
      }
    });
  }

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

  if (p.includes("emergency study mode") || p.includes("panic mode") || p.includes("hours before their")) {
    return JSON.stringify({
      sessionPlan: [
        { time: "0:00–0:45", activity: "Review highest yield concepts and core formulas", type: "study" },
        { time: "0:45–0:55", activity: "Short break — hydrate and stretch", type: "break" }
      ],
      likelyQuestions: [
        { question: "What is the primary mechanism discussed in this topic?", probability: "High", topic: "Fundamentals" },
        { question: "How do you apply the main formula to a novel scenario?", probability: "Medium", topic: "Applications" }
      ],
      cheatSheet: [
        { topic: "Fundamentals", facts: ["Core equation is X = Y + Z", "Always check your units", "Remember the right-hand rule"] },
        { topic: "Applications", facts: ["Use edge case limits to verify", "Draw a free body diagram"] }
      ]
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

  if (p.includes("diagnose the mistake") || p.includes("why am i wrong")) {
    return JSON.stringify({
      mistakeType: "Conceptual",
      whatWentWrong: "Mock wrong explanation.",
      gapIdentified: "Mock conceptual gap.",
      howToFix: "Review the core fundamentals.",
      practiceQuestion: "What is 2+2?",
      severity: "moderate"
    });
  }

  if (p.includes("exam autopsy") || p.includes("scan your mistakes")) {
    return JSON.stringify({
      subject: "Mock Subject",
      totalQuestions: 1,
      mistakes: [{
        questionNumber: "1",
        questionText: "Mock Q",
        studentAnswer: "Mock A",
        correctAnswer: "Mock C",
        mistakeType: "Conceptual",
        whatWentWrong: "Mock",
        rootGap: "Mock Gap",
        fix: "Mock Fix",
        severity: "minor"
      }],
      dominantMistakeType: "Conceptual",
      severityScore: 10,
      overallSummary: "Mock summary"
    });
  }

  if (p.includes("extract all past year questions") || p.includes("pyq solver")) {
    return JSON.stringify({
      subject: "Math",
      totalQuestions: 1,
      questions: [{
        number: "Q1",
        question: "Mock past year question",
        marks: 5,
        topic: "Algebra",
        modelAnswer: "Mock solution steps",
        keyTerms: ["mock"],
        likelyToRepeat: true,
        repeatReason: "repeated"
      }],
      topicFrequency: {"Algebra": 1},
      examYear: "2024"
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

const TEXT_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant"
];

async function generateContentWithFallback(params: {
  model: string;
  contents: any;
  config?: any;
}) {
  let promptText = "";
  if (typeof params.contents === "string") {
    promptText = params.contents;
  } else if (params.contents && Array.isArray(params.contents.parts)) {
    const textPart = params.contents.parts.find((p: any) => p.text);
    if (textPart) {
      promptText = textPart.text;
    } else {
      promptText = JSON.stringify(params.contents.parts);
    }
  } else if (params.contents && typeof params.contents === "object") {
    promptText = JSON.stringify(params.contents);
  }

  let lastError: any = null;
  for (const model of TEXT_MODELS) {
    try {
      console.log(`[Groq Proxy] Attempting generation with model: ${model}`);
      const response = await withTimeout(
        groq.chat.completions.create({
          model: model,
          messages: [
            {
              role: "system",
              content: "You are an advanced study assistant. You must always return your response as a valid, well-formed JSON object or array as requested. Do not wrap the JSON output in markdown code blocks or backticks. Start with '{' or '[' and end with '}' or ']'. Do not output any other text."
            },
            {
              role: "user",
              content: promptText
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
        }),
        20000,
        `Generation with model ${model} timed out after 20s`
      );
      return { text: response.choices[0]?.message?.content || "" };
    } catch (error: any) {
      lastError = error;
      console.warn(`[Groq Proxy] Model ${model} failed:`, error.message || error);
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
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant"
  ];
  
  const messages: any[] = [];
  for (const item of params.history) {
    let role = "user";
    if (item.role === "model" || item.role === "assistant") {
      role = "assistant";
    }
    
    let content = "";
    if (Array.isArray(item.parts)) {
      const textPart = item.parts.find((p: any) => p.text);
      content = textPart ? textPart.text : JSON.stringify(item.parts);
    } else if (typeof item.parts === "string") {
      content = item.parts;
    } else if (item.content) {
      content = item.content;
    }
    
    messages.push({ role, content });
  }
  
  messages.push({ role: "user", content: params.message });
  
  let lastError: any = null;
  for (const model of modelsToTry) {
    try {
      console.log(`[Groq Proxy] Attempting chat with model: ${model}`);
      const response = await withTimeout(
        groq.chat.completions.create({
          model: model,
          messages: messages,
          temperature: 0.7,
        }),
        20000,
        `Chat with model ${model} timed out after 20s`
      );
      return { text: response.choices[0]?.message?.content || "" };
    } catch (error: any) {
      lastError = error;
      console.warn(`[Groq Proxy] Chat Model ${model} failed:`, error.message || error);
    }
  }
  throw lastError;
}

async function generateMultimodalWithFallback(params: {
  prompt: string;
  fileData: string;
  mimeType: string;
  model?: string;
}) {
  const { prompt, fileData, mimeType } = params;

  if (mimeType.startsWith("image/")) {
    const visionModels = [
      "llama-3.2-11b-vision-preview",
      "llama-3.2-90b-vision-preview"
    ];
    
    let lastError: any = null;
    for (const model of visionModels) {
      try {
        console.log(`[Groq Proxy] Attempting image vision with model: ${model}`);
        const response = await withTimeout(
          groq.chat.completions.create({
            model: model,
            messages: [
              {
                role: "system",
                content: "You are an advanced exam/study assistant. Answer the user prompt based on the provided image. If the user expects a structured JSON output, return only valid, well-formed JSON without markdown code blocks/fences. Start with '{' or '[' and end with '}' or ']'. Do not output any other text."
              },
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${mimeType};base64,${fileData}`
                    }
                  }
                ]
              }
            ],
            response_format: { type: "json_object" },
            temperature: 0.2,
          }),
          20000,
          `Vision request with model ${model} timed out after 20s`
        );
        return { text: response.choices[0]?.message?.content || "" };
      } catch (error: any) {
        lastError = error;
        console.warn(`[Groq Proxy] Vision Model ${model} failed:`, error.message || error);
      }
    }
    throw lastError;
  } else if (mimeType === "application/pdf" || mimeType.includes("pdf")) {
    console.log("[Groq Proxy] Parsing PDF base64 data using pdf-parse...");
    const pdfBuffer = Buffer.from(fileData, "base64");
    const parser = new pdf(new Uint8Array(pdfBuffer));
    const parsedPdf = await parser.getText();
    const pdfText = parsedPdf.text || "";
    console.log(`[Groq Proxy] PDF parsed successfully, extracted ${pdfText.length} characters.`);
    
    const enrichedPrompt = `
Here is the text extracted from the uploaded PDF document:
---START PDF TEXT---
${pdfText}
---END PDF TEXT---

Using the text above, answer this request:
${prompt}
`;
    return await generateContentWithFallback({
      model: "llama-3.3-70b-versatile",
      contents: enrichedPrompt,
    });
  } else {
    throw new Error(`Unsupported mimeType: ${mimeType}`);
  }
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
    console.warn("Groq Error, falling back to mock response:", error.message || error);
    try {
      const mockText = getMockGenerateResponse(prompt);
      res.json({ text: mockText });
    } catch (mockError: any) {
      res.status(500).json({ error: error.message || "Groq and fallback both failed" });
    }
  }
});

app.post("/api/gemini/multimodal", async (req, res) => {
  const { prompt, fileData, mimeType, model: modelName, config } = req.body;
  try {
    const response = await generateMultimodalWithFallback({
      prompt,
      fileData,
      mimeType,
      model: modelName,
    });
    res.json({ text: response.text });
  } catch (error: any) {
    console.warn("Groq Multimodal Error, falling back to mock response:", error.message || error);
    try {
      const mockText = getMockGenerateResponse(prompt);
      res.json({ text: mockText });
    } catch (mockError: any) {
      res.status(500).json({ error: error.message || "Groq and fallback both failed" });
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
    console.warn("Groq Chat Error, falling back to mock response:", error.message || error);
    try {
      const mockText = getMockChatResponse(history);
      res.json({ text: mockText });
    } catch (mockError: any) {
      res.status(500).json({ error: error.message || "Groq and fallback both failed" });
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
