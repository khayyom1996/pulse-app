const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const authService = require('../services/authService');

/**
 * GET /api/ai/history
 * Get chat history for the pair
 */
router.get('/history', async (req, res) => {
    try {
        const initData = req.headers['x-telegram-init-data'];
        const telegramUser = authService.validateInitData(initData);
        if (!telegramUser) return res.status(401).json({ error: 'Unauthorized' });

        const user = await authService.getOrCreateUser(telegramUser);
        const pair = await authService.getUserPair(user.id);
        if (!pair) return res.status(404).json({ error: 'Pair not found' });

        const history = await aiService.getChatHistory(pair.id);
        res.json({ history });
    } catch (error) {
        console.error('AI History Error:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

/**
 * POST /api/ai/chat
 * Send a message to the AI Psychologist
 */
router.post('/chat', async (req, res) => {
    try {
        const initData = req.headers['x-telegram-init-data'];
        const { message } = req.body;

        if (!message) return res.status(400).json({ error: 'Message is required' });

        const telegramUser = authService.validateInitData(initData);
        if (!telegramUser) return res.status(401).json({ error: 'Unauthorized' });

        const user = await authService.getOrCreateUser(telegramUser);
        if (!user.isPremium) return res.status(403).json({ error: 'Premium required' });

        const pair = await authService.getUserPair(user.id);
        if (!pair) return res.status(404).json({ error: 'Pair not found' });

        const response = await aiService.sendMessage(
            pair.id,
            user.id,
            message,
            user.languageCode
        );

        res.json({ response });
    } catch (error) {
        console.error('AI Chat Error:', error);
        res.status(500).json({ error: 'Failed to get AI response' });
    }
});

module.exports = router;
