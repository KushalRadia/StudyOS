# StudyOS

> **A premium AI‑powered learning companion** – Explore concepts, generate flashcards, plan deadlines, and more.

---

## ✨ Overview
StudyOS is a modern web application that leverages **Gemini‑powered AI** to assist students and lifelong learners.  It combines a sleek, glass‑morphed UI with five intelligent tools:

1. **Five‑Minute Explainer** – Get concise, jargon‑free explanations of any topic.
2. **Socratic Tutor** – Engage in a back‑and‑forth dialogue to deepen understanding.
3. **Flashcards Generator** – Create spaced‑repetition flashcards instantly.
4. **Mind‑Mapper** – Visualise concept relationships in an interactive graph.
5. **Deadline Planner** – Build realistic study schedules with AI‑driven time‑budgeting.

The app runs entirely locally (or via a lightweight Express proxy) and gracefully falls back to mock data when the Gemini API quota is exceeded – ensuring a smooth experience even on a free tier.

---

## 🚀 Features & Tool Usage
| Tool | What it does | How to use |
|------|--------------|------------|
| **Five‑Minute Explainer** | Generates a concise summary (≈300 words) with bullet points and examples. | Type a topic in the *Explainer* tab and press **Generate**. |
| **Socratic Tutor** | Conducts a Socratic dialogue, asking probing questions to guide you to the answer. | Open the *Tutor* tab, enter a question, and interact with the AI. |
| **Flashcards Generator** | Produces Q/A flashcards formatted for Anki or Quizlet, with optional images. | In the *Flashcards* view, input a concept list and click **Create**. |
| **Mind‑Mapper** | Builds an interactive node‑edge graph of related concepts using D3.js. | Select *Mind‑Mapper*, add a seed term, and expand nodes with the **Explore** button. |
| **Deadline Planner** | Takes a target date and study workload, then outputs a day‑by‑day plan with milestones. | Fill the date picker and workload fields in *Planner* and press **Build My Plan**. |

---

## 🛠️ Tech Stack
- **Frontend**: React 18, Vite, Tailwind‑CSS (customized for a dark glass‑morphism theme), TypeScript.
- **Backend**: Express 4 proxy (`server.ts`) that forwards Gemini requests and provides **fallback mock responses**.
- **Testing**: Jest + Puppeteer for end‑to‑end multi‑agent tests (`e2e_multi_agent.js`).
- **CI**: GitHub Actions run lint, build, and test on each push.

---

## 📦 Installation
```bash
# 1. Clone the repo
git clone https://github.com/yourname/StudyOS.git
cd StudyOS

# 2. Install dependencies (uses npm; works with pnpm or yarn as well)
npm install

# 3. (Optional) Create a .env file with your Gemini API key
cp .env.example .env
# Edit .env and set GEMINI_API_KEY=your_key_here
```

---

## ▶️ Running the App
```bash
# Development server (hot‑reloading)
npm run dev

# Build for production
npm run build

# Start the production server (after build)
npm start
```
The app will be available at `http://localhost:5173`.

---

## 🧪 Testing
```bash
# Run unit + integration tests
npm test

# Run the full E2E suite (spawns multiple headless browsers)
node e2e_multi_agent.js
```
All tests currently pass, confirming that each AI‑tool works end‑to‑end.

---

## 📚 Architecture Diagram
![Architecture](file:///C:/Users/twink/.gemini/antigravity-ide/brain/b51a8686-1879-4c6f-97f2-1a075b8c6a43/media__1779384812141.png)

---

## 🎨 Design Highlights
- **Dark glass‑morphism UI** with vibrant accent gradients.
- **Google Font** `Inter` for crisp, modern typography.
- Subtle micro‑animations on button hover & card flips.
- Responsive layout – works on desktop and tablets.

---

## 🤝 Contributing
Contributions are welcome! Please fork the repo, create a feature branch, and submit a PR.

1. Follow the existing code‑style (see `.eslintrc`).
2. Write tests for new features.
3. Update the README if you add a new tool.

---

## 📄 License
MIT © 2026 StudyOS contributors.

---

## 🙏 Acknowledgements
- **Gemini API** – powering the AI core.
- **Vite** – lightning‑fast dev server.
- **Puppeteer** – for robust browser‑based testing.
- Community contributors for design assets and bug‑fixes.

---

*Happy studying! 🚀*
## 🚀 Promo

<div class="typewriter">
  <p>Stop studying harder. Study smarter.</p>
</div>

<style>
.typewriter p {
  overflow: hidden;
  border-right: .15em solid #00ffcc;
  white-space: nowrap;
  margin: 0 auto;
  letter-spacing: .15em;
  animation: typing 3.5s steps(30, end), blink-caret .75s step-end infinite;
}
@keyframes typing {
  from { width: 0 }
  to { width: 100% }
}
@keyframes blink-caret {
  from, to { border-color: transparent }
  50% { border-color: #00ffcc; }
}
</style>
