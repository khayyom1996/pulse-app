const { GoogleGenerativeAI } = require('@google/generative-ai');
const { AiChat } = require('../models');

class AiService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    }

    /**
     * Get system prompt for the psychologist
     */
    getSystemPrompt(language = 'ru') {
        if (language === 'en') {
            return `You are a professional, empathetic, and wise relationship psychologist in the Pulse app. 
            Your goal is to help a couple improve their communication, intimacy, and understanding. 
            Keep your responses concise, supportive, and practical. Use a warm tone.
            Never take sides; always look for common ground. 
            If they ask for advice, give it in a non-judgmental way.
            Reference their active "Pulse" (activity together) if relevant.`;
        }
        return `Ты — профессиональный, эмпатичный и мудрый семейный психолог в приложении Pulse. 
        Твоя цель — помочь паре улучшить общение, близость и взаимопонимание. 
        Отвечай кратко, поддерживающе и практично. Используй теплый тон.
        Никогда не вставай на чью-либо сторону, всегда ищи точки соприкосновения. 
        Если просят совета, давай его мягко и без осуждения.
        Если уместно, упоминай их активность в приложении (клики любви, общие желания).`;
    }

    /**
     * Send message to AI and store history
     */
    async sendMessage(pairId, userId, message, language = 'ru') {
        try {
            // 1. Fetch recent history from DB
            const history = await AiChat.findAll({
                where: { pairId },
                order: [['createdAt', 'ASC']],
                limit: 20,
            });

            // 2. Format history for Gemini
            const contents = history.map(chat => ({
                role: chat.role,
                parts: [{ text: chat.message }],
            }));

            // 3. Add current user message to DB
            await AiChat.create({
                pairId,
                userId,
                role: 'user',
                message,
            });

            // 4. Start chat with Gemini
            const chatSession = this.model.startChat({
                history: contents,
                systemInstruction: {
                    parts: [{ text: this.getSystemPrompt(language) }]
                },
            });

            const result = await chatSession.sendMessage(message);
            const responseText = result.response.text();

            // 5. Store AI response in DB
            await AiChat.create({
                pairId,
                userId, // We still use the same user ID to link it to the requestor's context
                role: 'model',
                message: responseText,
            });

            return responseText;
        } catch (error) {
            console.error('Gemini API Error:', error);
            throw new Error('Failed to get response from AI');
        }
    }

    /**
     * Get chat history for a pair
     */
    async getChatHistory(pairId) {
        return await AiChat.findAll({
            where: { pairId },
            order: [['createdAt', 'ASC']],
            limit: 50,
        });
    }
}

module.exports = new AiService();
