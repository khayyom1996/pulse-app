const { AiChat, Wish, User, Pair } = require('../models');

class AiService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    }

    /**
     * Get system prompt for the psychologist
     */
    getSystemPrompt(language = 'ru', context = '') {
        let prompt = '';
        if (language === 'en') {
            prompt = `You are a professional, empathetic, and wise relationship psychologist in the Pulse app. 
            Your goal is to help a couple improve their communication, intimacy, and understanding. 
            Keep your responses concise, supportive, and practical. Use a warm tone.
            Never take sides; always look for common ground. 
            If they ask for advice, give it in a non-judgmental way.
            Reference their active "Pulse" (activity together) if relevant.`;
        } else {
            prompt = `Ты — профессиональный, эмпатичный и мудрый семейный психолог в приложении Pulse. 
            Твоя цель — помочь паре улучшить общение, близость и взаимопонимание. 
            Отвечай кратко, поддерживающе и практично. Используй теплый тон.
            Никогда не вставай на чью-либо сторону, всегда ищи точки соприкосновения. 
            Если просят совета, давай его мягко и без осуждения.
            Если уместно, упоминай их активность в приложении (клики любви, общие желания).`;
        }

        if (context) {
            prompt += `\n\n${context}`;
        }

        return prompt;
    }

    /**
     * Get context about the couple (wishes, etc.)
     */
    async _getCoupleContext(pairId, currentUserId) {
        try {
            const pair = await Pair.findByPk(pairId, {
                include: [
                    { model: User, as: 'user1', attributes: ['id', 'firstName'] },
                    { model: User, as: 'user2', attributes: ['id', 'firstName'] }
                ]
            });

            if (!pair) return '';

            const wishes = await Wish.findAll({
                where: { pairId, isDone: false },
                attributes: ['userId', 'text']
            });

            // Helper to get name
            const getName = (user) => user?.firstName || 'Партнёр';

            const user1Name = getName(pair.user1);
            const user2Name = pair.user2 ? getName(pair.user2) : 'Партнёр 2 (еще не присоединился)';

            let context = `CONTEXT ABOUT THE COUPLE:\n`;
            context += `- Partner 1: ${user1Name}\n`;
            if (pair.user2) {
                context += `- Partner 2: ${user2Name}\n`;
            }

            // Identify current user
            if (currentUserId) {
                const currentUser = currentUserId == pair.user1Id ? user1Name : user2Name;
                context += `\nCURRENTLY SPEAKING: ${currentUser} (User ID: ${currentUserId})\n`;
            }

            if (wishes.length > 0) {
                context += `\nWISHES (ЖЕЛАНИЯ):\n`;
                // User 1
                const user1Wishes = wishes.filter(w => w.userId == pair.user1Id);
                if (user1Wishes.length > 0) {
                    context += `${user1Name} хочет:\n${user1Wishes.map(w => `- ${w.text}`).join('\n')}\n`;
                }

                // User 2
                if (pair.user2Id) {
                    const user2Wishes = wishes.filter(w => w.userId == pair.user2Id);
                    if (user2Wishes.length > 0) {
                        context += `${user2Name} хочет:\n${user2Wishes.map(w => `- ${w.text}`).join('\n')}\n`;
                    }
                }
            }

            return context;
        } catch (error) {
            console.error('Error getting couple context:', error);
            return '';
        }
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

            // 4. Get couple context
            const coupleContext = await this._getCoupleContext(pairId, userId);

            // 5. Start chat with Gemini
            const chatSession = this.model.startChat({
                history: contents,
                systemInstruction: {
                    parts: [{ text: this.getSystemPrompt(language, coupleContext) }]
                },
            });

            const result = await chatSession.sendMessage(message);
            const responseText = result.response.text();

            // 6. Store AI response in DB
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
