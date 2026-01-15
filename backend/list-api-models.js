require('dotenv').config();
const axios = require('axios');

async function listModels() {
    const key = process.env.GEMINI_API_KEY;
    console.log('Using key:', key ? '***' + key.slice(-4) : 'MISSING');
    try {
        const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        console.log('Models found:', response.data.models.map(m => m.name));
    } catch (e) {
        console.error('API Error:', e.response ? e.response.data : e.message);
    }
}

listModels();
