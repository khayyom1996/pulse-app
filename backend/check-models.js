require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // There is no direct listModels in the simple SDK, usually we just try names.
    // Let's try 'gemini-1.5-pro' and 'gemini-pro'
    const modelsToTry = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];

    for (const modelName of modelsToTry) {
        console.log(`Checking ${modelName}...`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hi");
            console.log(`✅ ${modelName} works! Response: ${result.response.text().substring(0, 20)}...`);
            break;
        } catch (e) {
            console.log(`❌ ${modelName} failed: ${e.message}`);
        }
    }
}

listModels();
