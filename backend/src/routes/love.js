const express = require('express');
const router = express.Router();
const loveService = require('../services/loveService');
const authService = require('../services/authService');
const { sendLoveNotification } = require('../bot');
const { User } = require('../models');

/**
 * POST /api/love
 * Send love to partner
 */
router.post('/', async (req, res) => {
    try {
        const userId = req.userId;
        const { message } = req.body;

        // Get user's pair
        const pair = await authService.getUserPair(userId);
        if (!pair) {
            return res.status(400).json({ error: 'You need to be paired first' });
        }

        if (!pair.user2Id) {
            return res.status(400).json({ error: 'Your partner has not joined yet' });
        }

        // Determine receiver
        const receiverId = pair.user1Id === userId ? pair.user2Id : pair.user1Id;

        const sender = await User.findByPk(userId);
        const result = await loveService.sendLove(pair.id, userId, receiverId, message, sender?.isPremium);

        if (!result.success) {
            return res.status(429).json({
                error: result.error,
                cooldownRemaining: result.cooldownRemaining,
            });
        }

        // Send notification to partner
        if (result.shouldNotify) {
            const sender = await User.findByPk(userId);
            const senderName = sender?.firstName || 'Ваш партнёр';

            // Fire and forget - don't wait for notification
            sendLoveNotification(receiverId, senderName, message).catch(err => {
                console.error('Failed to send love notification:', err.message);
            });
        }

        res.json({
            success: true,
            loveId: result.loveClick.id,
        });
    } catch (error) {
        console.error('Love error:', error);
        res.status(500).json({ error: 'Failed to send love' });
    }
});

/**
 * GET /api/love/history
 * Get love click history
 */
router.get('/history', async (req, res) => {
    try {
        const userId = req.userId;
        const limit = parseInt(req.query.limit) || 50;

        const pair = await authService.getUserPair(userId);
        if (!pair) {
            return res.status(400).json({ error: 'Not paired' });
        }

        const history = await loveService.getLoveHistory(pair.id, limit);
        const stats = await loveService.getTodayStats(pair.id);

        res.json({ history, stats });
    } catch (error) {
        console.error('Love history error:', error);
        res.status(500).json({ error: 'Failed to get history' });
    }
});

/**
 * GET /api/love/streak
 * Get current streak info
 */
router.get('/streak', async (req, res) => {
    try {
        const userId = req.userId;

        const pair = await authService.getUserPair(userId);
        if (!pair || !pair.TreeStreak) {
            return res.json({
                currentStreak: 0,
                maxStreak: 0,
                treeLevel: 1,
            });
        }

        res.json({
            currentStreak: pair.TreeStreak.currentStreak,
            maxStreak: pair.TreeStreak.maxStreak,
            treeLevel: pair.TreeStreak.treeLevel,
            lastInteraction: pair.TreeStreak.lastInteractionDate,
            totalInteractions: pair.TreeStreak.totalInteractions,
        });
    } catch (error) {
        console.error('Streak error:', error);
        res.status(500).json({ error: 'Failed to get streak' });
    }
});

module.exports = router;
