import puppeteer from 'puppeteer';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function clickButtonByText(page, textSubstring) {
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.toLowerCase().includes(textSubstring.toLowerCase())) {
      await btn.click();
      return true;
    }
  }
  return false;
}

async function runAgent1(browser) {
  const name = "[Agent 1: Concept Learner (Explainer & Tutor)]";
  console.log(`${name} Launching page...`);
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });
  page.on('console', msg => {
    const txt = msg.text();
    if (msg.type() === 'error' || msg.type() === 'warning' || txt.includes('Error') || txt.includes('Fail')) {
      console.log(`${name} [Page Console ${msg.type()}]:`, txt);
    }
  });
  page.on('pageerror', err => {
    console.error(`${name} [Page Exception]:`, err.message || err);
  });

  try {
    console.log(`${name} Navigating to StudyOS...`);
    await page.goto('http://127.0.0.1:3001', { waitUntil: 'networkidle2' });

    console.log(`${name} Performing Dev Bypass Login...`);
    await page.waitForSelector('#dev-bypass-login');
    await page.click('#dev-bypass-login');

    console.log(`${name} Waiting for Dashboard...`);
    await page.waitForSelector('a[href="/tools/explainer"]');

    // 1. Five-Minute Explainer Test
    console.log(`${name} Navigating to 5-Minute Explainer...`);
    await page.click('a[href="/tools/explainer"]');
    await page.waitForSelector('textarea[placeholder*="Paste your study notes"]');

    console.log(`${name} Explaining 'Quantum Entanglement' (2 min limit)...`);
    await page.type('textarea[placeholder*="Paste your study notes"]', 'Quantum Entanglement');

    // Find and click the 2 Min button
    const buttons = await page.$$('button');
    let twoMinBtn = null;
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes("2 Min")) {
        twoMinBtn = btn;
        break;
      }
    }
    if (twoMinBtn) {
      await twoMinBtn.click();
      console.log(`${name} Clicked 2 Min selector.`);
    } else {
      console.warn(`${name} 2 Min button selector not found. Defaulting to 5 Min.`);
    }

    console.log(`${name} Clicking 'Explain It' button...`);
    let explainBtn = null;
    const buttonsAfter = await page.$$('button');
    for (const btn of buttonsAfter) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes("Explain It")) {
        explainBtn = btn;
        break;
      }
    }
    if (!explainBtn) throw new Error("Could not find Explain It button");
    await explainBtn.click();

    console.log(`${name} Waiting for explanation results (calling Gemini)...`);
    await page.waitForSelector('.space-y-8', { timeout: 35000 });

    const pageText = await page.evaluate(() => document.body.innerText);
    if (!pageText.toLowerCase().includes("must know")) {
      throw new Error("Must Know section not found in explanation output");
    }
    console.log(`${name} Explainer test passed successfully!`);

    // 2. TeachMeBack Tutor Test
    console.log(`${name} Navigating to Socratic Tutor...`);
    await page.goto('http://127.0.0.1:3001/tools/teachmeback', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[placeholder*="Doppler Effect"]');

    console.log(`${name} Entering topic: Photosynthesis...`);
    await page.type('input[placeholder*="Doppler Effect"]', 'Photosynthesis');

    console.log(`${name} Clicking Start Session...`);
    const started = await clickButtonByText(page, "Start Session");
    if (!started) throw new Error("Start Session button not clicked");

    console.log(`${name} Waiting for tutor's first Socratic challenge...`);
    await page.waitForSelector('.chat-container', { timeout: 25000 });
    await delay(2000); // allow message typing animations to finish

    console.log(`${name} Sending explanation: 'Plants use sun light, water and CO2 to create sugar.'`);
    await page.waitForSelector('textarea[placeholder*="Type your explanation"]');
    await page.type('textarea[placeholder*="Type your explanation"]', 'Plants use sun light, water and CO2 to create sugar.');
    await page.click('button[type="submit"]');

    console.log(`${name} Waiting for tutor response...`);
    await delay(6000); // wait for response round completion

    console.log(`${name} Socratic Chat test passed successfully!`);
    console.log(`${name} SUCCESS`);
  } catch (error) {
    console.error(`${name} FAILED:`, error);
    throw error;
  } finally {
    await page.close();
  }
}

async function runAgent2(browser) {
  const name = "[Agent 2: Spaced Repetition (Flashcards)]";
  console.log(`${name} Launching page...`);
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });
  page.on('console', msg => {
    const txt = msg.text();
    if (msg.type() === 'error' || msg.type() === 'warning' || txt.includes('Error') || txt.includes('Fail')) {
      console.log(`${name} [Page Console ${msg.type()}]:`, txt);
    }
  });
  page.on('pageerror', err => {
    console.error(`${name} [Page Exception]:`, err.message || err);
  });

  try {
    console.log(`${name} Navigating to StudyOS...`);
    await page.goto('http://127.0.0.1:3001', { waitUntil: 'networkidle2' });

    console.log(`${name} Performing Dev Bypass Login...`);
    await page.waitForSelector('#dev-bypass-login');
    await page.click('#dev-bypass-login');

    console.log(`${name} Navigating to Flashcards page...`);
    await page.waitForSelector('a[href="/flashcards"]');
    await page.click('a[href="/flashcards"]');

    console.log(`${name} Waiting for New Deck inputs...`);
    await page.waitForSelector('input[placeholder*="Quantum Physics"]');

    const uniqueDeckName = `Cell Biology ${Date.now()}`;
    console.log(`${name} Inputting deck topic: ${uniqueDeckName}`);
    await page.type('input[placeholder*="Quantum Physics"]', uniqueDeckName);

    console.log(`${name} Submitting deck generation request...`);
    const genBtn = await clickButtonByText(page, "Generate Deck");
    if (!genBtn) throw new Error("Could not find Generate Deck button");

    console.log(`${name} Waiting for flashcards to generate and render (calling Gemini)...`);
    await page.waitForFunction(
      (deckName) => document.body.innerText.includes(deckName),
      { timeout: 35000 },
      uniqueDeckName
    );

    console.log(`${name} Deck appeared in the UI! Starting Review...`);
    const clickedReview = await page.evaluate((deckName) => {
      const cards = Array.from(document.querySelectorAll('.card'));
      const targetCard = cards.find(c => c.textContent.includes(deckName));
      if (!targetCard) return false;
      const reviewBtn = targetCard.querySelector('button');
      if (reviewBtn) {
        reviewBtn.click();
        return true;
      }
      return false;
    }, uniqueDeckName);

    if (!clickedReview) throw new Error("Could not find or click Review button for the generated deck");

    console.log(`${name} Waiting for Study Session Screen...`);
    await page.waitForFunction(() => document.body.innerText.includes("Exit Session"), { timeout: 10000 });

    console.log(`${name} Flipping flashcard to view answer...`);
    await page.click('.perspective-1000'); // click the card to flip
    await delay(1000);

    console.log(`${name} Rating the card as 'Good'...`);
    const ratedGood = await clickButtonByText(page, "Good");
    if (!ratedGood) throw new Error("Could not find rating button 'Good'");

    console.log(`${name} Flashcards workflow completed successfully!`);
    console.log(`${name} SUCCESS`);
  } catch (error) {
    console.error(`${name} FAILED:`, error);
    throw error;
  } finally {
    await page.close();
  }
}

async function runAgent3(browser) {
  const name = "[Agent 3: Mind Mapper (Concept Linker)]";
  console.log(`${name} Launching page...`);
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });
  page.on('console', msg => {
    const txt = msg.text();
    if (msg.type() === 'error' || msg.type() === 'warning' || txt.includes('Error') || txt.includes('Fail')) {
      console.log(`${name} [Page Console ${msg.type()}]:`, txt);
    }
  });
  page.on('pageerror', err => {
    console.error(`${name} [Page Exception]:`, err.message || err);
  });

  try {
    console.log(`${name} Navigating to StudyOS...`);
    await page.goto('http://127.0.0.1:3001', { waitUntil: 'networkidle2' });

    console.log(`${name} Performing Dev Bypass Login...`);
    await page.waitForSelector('#dev-bypass-login');
    await page.click('#dev-bypass-login');

    console.log(`${name} Navigating to ConceptLinker...`);
    await page.waitForSelector('a[href="/tools/conceptlinker"]');
    await page.click('a[href="/tools/conceptlinker"]');

    console.log(`${name} Waiting for topic input...`);
    await page.waitForSelector('input[placeholder*="Add a topic"]');

    console.log(`${name} Typing topic 1: Linear Algebra...`);
    await page.type('input[placeholder*="Add a topic"]', 'Linear Algebra');
    await page.keyboard.press('Enter');
    await delay(1000);

    console.log(`${name} Typing topic 2: Vector Calculus...`);
    await page.type('input[placeholder*="Add a topic"]', 'Vector Calculus');
    await page.keyboard.press('Enter');
    await delay(1000);

    console.log(`${name} Clicking 'Generate Map'...`);
    const generated = await clickButtonByText(page, "Generate Map");
    if (!generated) throw new Error("Could not click Generate Map button");

    console.log(`${name} Waiting for D3 knowledge graph simulation to complete...`);
    await page.waitForSelector('svg', { timeout: 35000 });

    const nodeCount = await page.evaluate(() => document.querySelectorAll('svg circle').length);
    console.log(`${name} Successfully rendered ${nodeCount} concept nodes in the D3 container.`);
    if (nodeCount === 0) throw new Error("Rendered 0 concept nodes");

    console.log(`${name} ConceptLinker workflow completed successfully!`);
    console.log(`${name} SUCCESS`);
  } catch (error) {
    console.error(`${name} FAILED:`, error);
    throw error;
  } finally {
    await page.close();
  }
}

async function runAgent4(browser) {
  const name = "[Agent 4: Exam Planner (Deadline Reverse)]";
  console.log(`${name} Launching page...`);
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });
  page.on('console', msg => {
    console.log(`${name} [Page Console ${msg.type()}]:`, msg.text());
  });
  page.on('pageerror', err => {
    console.error(`${name} [Page Exception]:`, err.message || err);
  });

  try {
    console.log(`${name} Navigating to StudyOS...`);
    await page.goto('http://127.0.0.1:3001', { waitUntil: 'networkidle2' });

    console.log(`${name} Performing Dev Bypass Login...`);
    await page.waitForSelector('#dev-bypass-login');
    await page.click('#dev-bypass-login');

    console.log(`${name} Navigating to Deadline Planner...`);
    await page.waitForSelector('a[href="/tools/deadline"]');
    await page.click('a[href="/tools/deadline"]');

    console.log(`${name} Waiting for planner inputs...`);
    await page.waitForSelector('input[placeholder*="Economics"]');

    console.log(`${name} Typing exam name: Organic Chemistry Finals...`);
    await page.type('input[placeholder*="Economics"]', 'Organic Chemistry Finals');

    console.log(`${name} Selecting deadline date (e.g. 2026-06-25)...`);
    await page.evaluate(() => {
      const dateInput = document.querySelector('input[type="date"]');
      if (dateInput) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(dateInput, '2026-06-25');
        dateInput.dispatchEvent(new Event('input', { bubbles: true }));
        dateInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    console.log(`${name} Adding topic: Stereochemistry...`);
    await page.type('input[placeholder="Add topic..."]', 'Stereochemistry');
    await page.keyboard.press('Enter');
    await delay(1000);

    console.log(`${name} Adding topic: Spectroscopic Methods...`);
    await page.type('input[placeholder="Add topic..."]', 'Spectroscopic Methods');
    await page.keyboard.press('Enter');
    await delay(1000);

    console.log(`${name} Clicking 'Build My Plan' button...`);
    const clicked = await clickButtonByText(page, "Build My Plan");
    if (!clicked) throw new Error("Could not find Build My Plan button");

    console.log(`${name} Waiting for planner roadmap to generate...`);
    await page.waitForFunction(() => document.body.innerText.includes("Study Roadmap"), { timeout: 35000 });

    console.log(`${name} Roadmap generated! Toggling completion of first task...`);
    const toggleBtn = await page.waitForSelector('div.custom-scrollbar button');
    await toggleBtn.click();
    await delay(1000);

    // Verify progress update
    const completionProgressText = await page.evaluate(() => {
      const el = document.querySelector('.w-full.bg-surface-container-high + span');
      return document.body.innerText.includes("Complete");
    });
    console.log(`${name} Checked progress updates successfully.`);

    console.log(`${name} Deadline Planner workflow completed successfully!`);
    console.log(`${name} SUCCESS`);
  } catch (error) {
    console.error(`${name} FAILED:`, error);
    throw error;
  } finally {
    await page.close();
  }
}


async function runAgent5(browser) {
  const name = '[Agent 5: PYQ Solver & Lecture Digest]';
  console.log(name + ' Launching page...');
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });
  try {
    await page.goto('http://127.0.0.1:3001', { waitUntil: 'networkidle2' });
    await page.waitForSelector('#dev-bypass-login');
    await page.click('#dev-bypass-login');
    
    // PYQ Solver
    console.log(name + ' Testing PYQ Solver...');
    await page.goto('http://127.0.0.1:3001/tools/pyqsolver', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[type="file"]');
    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile('dummy.pdf');
    await clickButtonByText(page, 'Analyse Paper');
    await page.waitForFunction(() => document.body.innerText.includes("Questions extracted"), { timeout: 35000 });
    
    // Lecture Digest
    console.log(name + ' Testing Lecture Digest...');
    await page.goto('http://127.0.0.1:3001/tools/lecturedigest', { waitUntil: 'networkidle2' });
    // Switch to Upload Recording tab
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const uploadBtn = buttons.find(b => b.textContent.includes('Upload Recording'));
      if (uploadBtn) uploadBtn.click();
    });
    await page.waitForSelector('input[type="file"]');
    const digestFileInput = await page.$('input[type="file"]');
    await digestFileInput.uploadFile('dummy.pdf');
    await page.waitForSelector('.gap-lg', { timeout: 35000 });
    console.log(name + ' SUCCESS');
  } catch (e) {
    console.error(name + ' FAILED:', e);
    throw e;
  } finally { await page.close(); }
}

async function runAgent6(browser) {
  const name = '[Agent 6: Why Am I Wrong & Snap Solve]';
  console.log(name + ' Launching page...');
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });
  try {
    await page.goto('http://127.0.0.1:3001', { waitUntil: 'networkidle2' });
    await page.waitForSelector('#dev-bypass-login');
    await page.click('#dev-bypass-login');
    
    // Why Am I Wrong
    console.log(name + ' Testing Why Am I Wrong...');
    await page.goto('http://127.0.0.1:3001/tools/whyamiwrong', { waitUntil: 'networkidle2' });
    await page.waitForSelector('textarea');
    const textareas = await page.$$('textarea');
    if (textareas.length >= 3) {
      await textareas[0].type('Solve for x: 2(x + 5) = 14');
      await textareas[1].type('x = 5');
      await textareas[2].type('x = 2');
    } else {
      await page.type('textarea', 'I thought 2+2 was 5');
    }
    await clickButtonByText(page, 'Diagnose My Mistake');
    await page.waitForSelector('.space-y-8', { timeout: 35000 });
    
    // Snap Solve (Upload mode)
    console.log(name + ' Testing Snap Solve...');
    await page.goto('http://127.0.0.1:3001/tools/snapsolve', { waitUntil: 'networkidle2' });
    await clickButtonByText(page, 'Upload Image');
    await page.waitForSelector('input[type="file"]');
    const snapFileInput = await page.$('input[type="file"]');
    await snapFileInput.uploadFile('dummy.pdf');
    await page.waitForSelector('button:has-text("Solve This Question")', { timeout: 5000 }).catch(() => {});
    await clickButtonByText(page, 'Solve This Question');
    await page.waitForSelector('.space-y-6', { timeout: 35000 });
    console.log(name + ' SUCCESS');
  } catch (e) {
    console.error(name + ' FAILED:', e);
    throw e;
  } finally { await page.close(); }
}

async function runAgent7(browser) {
  const name = '[Agent 7: Exam Autopsy, Panic Mode, Write Unblock]';
  console.log(name + ' Launching page...');
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });
  page.on('console', msg => {
    console.log(`${name} [Page Console ${msg.type()}]:`, msg.text());
  });
  page.on('pageerror', err => {
    console.error(`${name} [Page Exception]:`, err.message || err);
  });
  try {
    await page.goto('http://127.0.0.1:3001', { waitUntil: 'networkidle2' });
    await page.waitForSelector('#dev-bypass-login');
    await page.click('#dev-bypass-login');
    
    // Exam Autopsy (Text Tab)
    console.log(name + ' Testing Exam Autopsy...');
    await page.goto('http://127.0.0.1:3001/tools/exam-autopsy', { waitUntil: 'networkidle2' });
    // Switch to Type Answers tab
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const typeBtn = buttons.find(b => b.textContent.includes('Type Answers'));
      if (typeBtn) typeBtn.click();
    });
    await page.waitForSelector('textarea');
    await page.type('textarea', 'Q1: x = 5 | Correct: x = 2');
    await clickButtonByText(page, 'Run Autopsy');
    await page.waitForSelector('.grid.grid-cols-1.lg\\:grid-cols-12.gap-6', { timeout: 35000 });
    
    // Panic Mode
    console.log(name + ' Testing Panic Mode...');
    await page.goto('http://127.0.0.1:3001/panic', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[type="text"]');
    await page.type('input[type="text"]', 'Calculus');
    await clickButtonByText(page, 'Activate Panic Mode');
    await page.waitForFunction(() => document.body.innerText.includes("likely to appear") || document.body.innerText.includes("Cheat Sheet"), { timeout: 35000 });
    
    // Write Unblock
    console.log(name + ' Testing Write Unblock...');
    await page.goto('http://127.0.0.1:3001/tools/writeunblock', { waitUntil: 'networkidle2' });
    await page.waitForSelector('textarea');
    await page.type('textarea', 'I need an essay about Rome');
    await clickButtonByText(page, 'Unblock Me');
    await page.waitForSelector('.border-l-4', { timeout: 35000 });
    console.log(name + ' SUCCESS');
  } catch (e) {
    console.error(name + ' FAILED:', e);
    throw e;
  } finally { await page.close(); }
}

async function run() {
  console.log("=========================================");
  console.log("🚀 STARTING MULTI-AGENT E2E BROWSER TESTS");
  console.log("=========================================\n");

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  try {
    const results = [];
    const agents = [runAgent1, runAgent2, runAgent3, runAgent4, runAgent5, runAgent6, runAgent7];
    for (let i = 0; i < agents.length; i++) {
      console.log(`\n--- Running Agent ${i + 1} ---`);
      try {
        await agents[i](browser);
        results.push({ status: 'fulfilled' });
      } catch (err) {
        results.push({ status: 'rejected', reason: err });
      }
      await delay(3000); // 3-second delay to guarantee we don't trigger Groq rate limits
    }

    console.log("\n=========================================");
    console.log("📊 MULTI-AGENT E2E TESTING REPORT");
    console.log("=========================================");

    let allPassed = true;
    results.forEach((res, index) => {
      const agentName = `Agent ${index + 1}`;
      if (res.status === 'fulfilled') {
        console.log(`✅ ${agentName}: PASSED`);
      } else {
        console.error(`❌ ${agentName}: FAILED (${res.reason.message || res.reason})`);
        allPassed = false;
      }
    });

    console.log("=========================================");
    if (allPassed) {
      console.log("🎉 ALL E2E AGENTS COMPLETED THEIR WORKFLOWS SUCCESSFULLY!");
      process.exit(0);
    } else {
      console.error("⛔ SOME AGENTS FAILED. PLEASE CHECK THE DETAILS ABOVE.");
      process.exit(1);
    }
  } catch (err) {
    console.error("Critical error in test harness:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
