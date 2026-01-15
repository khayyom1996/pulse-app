require('dotenv').config();

// Mock AiChat model before requiring service
const { AiChat } = require('./src/models');
AiChat.findAll = async () => [];
AiChat.create = async (data) => data;

const aiService = require('./src/services/aiService');

async function testAi() {
    console.log('🧪 Starting AI Test...');
    console.log('🔑 API Key present:', !!process.env.GEMINI_API_KEY);

    if (!process.env.GEMINI_API_KEY) {
        console.error('❌ Missing GEMINI_API_KEY in .env file');
        return;
    }

    try {
        const userId = 123456789;
        const pairId = '00000000-0000-0000-0000-000000000000'; // Dummy UID
        const message = 'Привет! Психолог, дай совет как не ссориться?';

        console.log('📤 Sending message:', message);
        const response = await aiService.sendMessage(pairId, userId, message, 'ru');

        console.log('📥 AI Response:');
        console.log('-------------------');
        console.log(response);
        console.log('-------------------');
        console.log('✅ Test successful!');
    } catch (error) {
        console.error('❌ Test failed:');
        console.error(error);
    }
}

testAi();
