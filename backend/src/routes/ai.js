const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const authService = require('../services/authService');
const { AiChat, AppSetting } = require('../models');
const { Op } = require('sequelize');

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

        // Get remaining messages for today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayMessages = await AiChat.count({
            where: {
                userId: user.id,
                role: 'user',
                createdAt: { [Op.gte]: todayStart },
            },
        });

        const limitSetting = await AppSetting.findByPk('ai_daily_limit');
        const dailyLimit = limitSetting ? parseInt(limitSetting.value) : 3;

        res.json({
            history,
            remaining: Math.max(dailyLimit - todayMessages, 0),
            dailyLimit,
        });
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

        // Check if AI is globally enabled
        const aiEnabledSetting = await AppSetting.findByPk('ai_enabled');
        const aiEnabled = aiEnabledSetting ? aiEnabledSetting.value === 'true' : false;

        // If AI not globally enabled, require premium
        if (!aiEnabled && !user.isPremium) {
            return res.status(403).json({ error: 'Premium required' });
        }

        // Check daily message limit
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayMessages = await AiChat.count({
            where: {
                userId: user.id,
                role: 'user',
                createdAt: { [Op.gte]: todayStart },
            },
        });

        const limitSetting = await AppSetting.findByPk('ai_daily_limit');
        const dailyLimit = limitSetting ? parseInt(limitSetting.value) : 3;

        // Premium users get unlimited, free users get daily limit when AI is enabled
        if (!user.isPremium && todayMessages >= dailyLimit) {
            return res.status(429).json({
                error: 'Daily limit reached',
                remaining: 0,
                dailyLimit,
            });
        }

        const pair = await authService.getUserPair(user.id);
        if (!pair) return res.status(404).json({ error: 'Pair not found' });

        const response = await aiService.sendMessage(
            pair.id,
            user.id,
            message,
            user.languageCode
        );

        // Calculate remaining
        const remaining = user.isPremium
            ? 999
            : Math.max(dailyLimit - todayMessages - 1, 0);

        res.json({ response, remaining, dailyLimit });
    } catch (error) {
        console.error('AI Chat Error:', error);
        res.status(500).json({ error: 'Failed to get AI response' });
    }
});

module.exports = router;
