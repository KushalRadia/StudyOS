const http = require('http');

const SERVER_URL = 'http://127.0.0.1:3001/api/gemini/generate';
const TOTAL_REQUESTS = 100; // Ultimate pressure test!

const toolPrompts = [
  "Explain Quantum Entanglement simply.", // Explainer
  "Generate flashcards for Biology.", // Flashcards
  "Create a concept map for Linear Algebra.", // ConceptLinker
  "Plan an exam for Chemistry by June 25th.", // DeadlineReverse
  "Extract all past year questions from this paper.", // PYQSolver
  "Diagnose the mistake: I thought 2+2=5.", // WhyAmIWrong
  "Scan your mistakes for this exam autopsy.", // ExamAutopsy
  "Solve this snapped question.", // SnapSolve
  "I am panicking, create a cram schedule.", // PanicMode
  "Unblock me for my history essay.", // WriteUnblock
];

async function sendRequest(id, prompt) {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      prompt: prompt,
      model: "gemini-2.5-flash",
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const startTime = Date.now();
    const req = http.request(SERVER_URL, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        const duration = Date.now() - startTime;
        let success = res.statusCode === 200;
        let isMock = false;
        
        try {
          // If it's a JSON response, we parse it
          if (body.startsWith('{') || body.startsWith('[')) {
             JSON.parse(body);
          }
          if (body.includes("Mock")) isMock = true;
        } catch(e) {
          success = false;
        }

        resolve({
          id,
          status: res.statusCode,
          success,
          isMock,
          duration,
          promptPreview: prompt.substring(0, 25) + "..."
        });
      });
    });

    req.on('error', (e) => {
      resolve({ id, status: 0, success: false, error: e.message });
    });

    req.write(data);
    req.end();
  });
}

async function runPressureTest() {
  console.log(`🚀 STARTING ULTIMATE PRESSURE TEST`);
  console.log(`📡 Sending ${TOTAL_REQUESTS} parallel requests to StudyOS Backend...`);
  
  const promises = [];
  for (let i = 0; i < TOTAL_REQUESTS; i++) {
    const prompt = toolPrompts[i % toolPrompts.length];
    promises.push(sendRequest(i + 1, prompt));
  }

  const results = await Promise.all(promises);
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const mocks = results.filter(r => r.isMock).length;
  
  console.log("\n=========================================");
  console.log("🔥 PRESSURE TEST RESULTS");
  console.log("=========================================");
  console.log(`Total Requests Sent: ${TOTAL_REQUESTS}`);
  console.log(`✅ Passed: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`🛡️ Mock Fallbacks Triggered: ${mocks}`);
  console.log("=========================================");
  
  if (failed === 0) {
    console.log("🎉 SYSTEM IS INDESTRUCTIBLE! StudyOS successfully handled maximum pressure without a single crash.");
  } else {
    console.log("⚠️ SOME REQUESTS FAILED. System is unstable.");
    console.log(results.filter(r => !r.success).slice(0, 5));
  }
}

runPressureTest();
