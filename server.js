const express = require('express');
const { chromium } = require('playwright');
const cors = require('cors');

const app = express();

// Enable Cross-Origin Resource Sharing so your Netlify frontend can talk to this backend
app.use(cors());
app.use(express.json());

app.post('/run-automation', async (req, res) => {
    const userPrompt = req.body.prompt || "";
    console.log(`\n🤖 Processing universal prompt: "${userPrompt}"`);

    // 1. Smart URL Router Engine
    let targetUrl = "";
    const lowerPrompt = userPrompt.toLowerCase();

    if (lowerPrompt.includes("amazon")) targetUrl = "https://www.amazon.com";
    else if (lowerPrompt.includes("youtube") || lowerPrompt.includes("yt")) targetUrl = "https://www.youtube.com";
    else if (lowerPrompt.includes("chatgpt")) targetUrl = "https://chatgpt.com";
    else if (lowerPrompt.includes("instagram")) targetUrl = "https://www.instagram.com";
    else if (lowerPrompt.includes("google")) targetUrl = "https://www.google.com";
    else if (lowerPrompt.includes("github")) targetUrl = "https://github.com";
    else {
        const urlMatch = userPrompt.match(/(https?:\/\/[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/);
        targetUrl = urlMatch ? (urlMatch[0].startsWith('http') ? urlMatch[0] : 'https://' + urlMatch[0]) : "https://www.google.com";
    }

    // 2. Smart NLP Action Parser (Extracting search terms)
    let textToInject = "";
    const actionMatch = userPrompt.match(/(?:search for|search to|type|find|ask|query|send)\s+['"“]?([a-zA-Z0-9\s-_,.:?]+)['"”]?/i);
    if (actionMatch && actionMatch[1]) {
        textToInject = actionMatch[1].trim();
    }

    // Immediately respond to Netlify to prevent connection timeouts
    res.send({ 
        status: "SUCCESS",
        message: `Target URL parsed: ${targetUrl}. Action text: "${textToInject || 'None'}". Executing background cloud container...` 
    });

    try {
        // CRITICAL FOR CLOUD: Headless must be true, sandboxes disabled for Linux container environments
        const browser = await chromium.launch({ 
            headless: true, 
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        }); 
        const context = await browser.newContext();
        const page = await context.newPage();

        console.log(`🌐 Navigating to: ${targetUrl}`);
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

        if (textToInject) {
            console.log(`✍️ Locating interactive input wrapper...`);
            const universalInputSelector = 'textarea, input[type="text"], input[type="search"], [role="combobox"], [contenteditable="true"]';

            await page.waitForSelector(universalInputSelector, { timeout: 10000 });
            const primaryInput = page.locator(universalInputSelector).first();

            await primaryInput.fill(textToInject);
            console.log(`🚀 Dispatching virtual system Enter command...`);
            await primaryInput.press('Enter');

            // Optional: Give the page 3 seconds to execute/load results before closing down
            await page.waitForTimeout(3000);
        }

        console.log("✅ Cloud task complete.");
        await browser.close();
    } catch (error) {
        console.error("❌ Automation runtime error:", error.message);
    }
});

// CRITICAL FOR CLOUD: Dynamically use the host provider's port configuration
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('===========================================================');
    console.log(`   🚀 CLOUD AI UNIVERSAL BACKEND ACTIVE ON PORT: ${PORT}   `);
    console.log('===========================================================');
});