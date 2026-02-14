const express = require('express');
const router = express.Router();
const wishService = require('../services/wishService');
const authService = require('../services/authService');
const { Wish } = require('../models');

/**
 * GET /api/wishes/cards
 * Get available cards to swipe
 */
router.get('/cards', async (req, res) => {
    try {
        const userId = req.userId;
        const category = req.query.category;
        const limit = parseInt(req.query.limit) || 10;

        const pair = await authService.getUserPair(userId);
        if (!pair) {
            return res.status(400).json({ error: 'Not paired' });
        }

        const cards = await wishService.getAvailableCards(userId, pair.id, category, limit);
        res.json({ cards });
    } catch (error) {
        console.error('Get cards error:', error);
        res.status(500).json({ error: 'Failed to get cards' });
    }
});

/**
 * POST /api/wishes/swipe
 * Swipe on a card
 */
router.post('/swipe', async (req, res) => {
    try {
        const userId = req.userId;
        const { cardId, liked } = req.body;

        if (cardId === undefined || liked === undefined) {
            return res.status(400).json({ error: 'cardId and liked are required' });
        }

        const pair = await authService.getUserPair(userId);
        if (!pair) {
            return res.status(400).json({ error: 'Not paired' });
        }

        const result = await wishService.swipeCard(userId, pair.id, cardId, liked);

        if (result.error) {
            return res.status(400).json({ error: result.error });
        }

        res.json({
            success: true,
            isMatch: result.isNewMatch || false,
            match: result.match,
        });
    } catch (error) {
        console.error('Swipe error:', error);
        res.status(500).json({ error: 'Failed to process swipe' });
    }
});

/**
 * GET /api/wishes/matches
 * Get all matches
 */
router.get('/matches', async (req, res) => {
    try {
        const userId = req.userId;

        const pair = await authService.getUserPair(userId);
        if (!pair) {
            return res.status(400).json({ error: 'Not paired' });
        }

        const matches = await wishService.getMatches(pair.id);
        res.json({ matches });
    } catch (error) {
        console.error('Get matches error:', error);
        res.status(500).json({ error: 'Failed to get matches' });
    }
});

/**
 * POST /api/wishes/matches/:id/complete
 * Mark match as completed
 */
router.post('/matches/:id/complete', async (req, res) => {
    try {
        const userId = req.userId;
        const matchId = req.params.id;

        const pair = await authService.getUserPair(userId);
        if (!pair) {
            return res.status(400).json({ error: 'Not paired' });
        }

        const result = await wishService.completeMatch(matchId, pair.id);

        if (result.error) {
            return res.status(404).json({ error: result.error });
        }

        res.json({ match: result.match });
    } catch (error) {
        console.error('Complete match error:', error);
        res.status(500).json({ error: 'Failed to complete match' });
    }
});

/**
 * GET /api/wishes/stats
 * Get swipe statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const userId = req.userId;

        const pair = await authService.getUserPair(userId);
        if (!pair) {
            return res.json({
                totalSwiped: 0,
                liked: 0,
                matches: 0,
                completed: 0,
            });
        }

        const stats = await wishService.getStats(userId, pair.id);
        res.json({ stats });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// =============================================
// WISH LIST API (new list-based wishes)
// =============================================

/**
 * GET /api/wishes/list
 * Get all wishes for the pair
 */
router.get('/list', async (req, res) => {
    try {
        const userId = req.userId;
        const pair = await authService.getUserPair(userId);
        if (!pair) {
            return res.status(400).json({ error: 'Not paired' });
        }

        const wishes = await Wish.findAll({
            where: { pairId: pair.id },
            order: [['isDone', 'ASC'], ['createdAt', 'DESC']],
        });

        res.json({ wishes, userId });
    } catch (error) {
        console.error('Get wishes error:', error);
        res.status(500).json({ error: 'Failed to get wishes' });
    }
});

/**
 * POST /api/wishes
 * Create a new wish
 */
router.post('/', async (req, res) => {
    try {
        const userId = req.userId;
        const { text, emoji } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({ error: 'Text is required' });
        }

        const pair = await authService.getUserPair(userId);
        if (!pair) {
            return res.status(400).json({ error: 'Not paired' });
        }

        const user = await User.findByPk(userId);
        if (!user.isPremium) {
            const AppSetting = require('../models/AppSetting');
            const limitSetting = await AppSetting.findOne({ where: { key: 'free_wishes_limit' } });
            const limit = parseInt(limitSetting?.value || '3');

            const wishCount = await Wish.count({ where: { pairId: pair.id, userId } });
            if (wishCount >= limit) {
                return res.status(403).json({
                    error: 'limit_reached',
                    code: 'LIMIT_WISHES',
                    message: `Free users can only add ${limit} wishes. Upgrade to Pulse Plus for more!`
                });
            }
        }

        const wish = await Wish.create({
            pairId: pair.id,
            userId,
            text: text.trim(),
            emoji: emoji || '💫',
        });

        res.json({ wish });
    } catch (error) {
        console.error('Create wish error:', error);
        res.status(500).json({ error: 'Failed to create wish' });
    }
});

/**
 * PUT /api/wishes/:id/done
 * Toggle wish done status
 */
router.put('/:id/done', async (req, res) => {
    try {
        const userId = req.userId;
        const wishId = req.params.id;

        const pair = await authService.getUserPair(userId);
        if (!pair) {
            return res.status(400).json({ error: 'Not paired' });
        }

        const wish = await Wish.findOne({
            where: { id: wishId, pairId: pair.id },
        });

        if (!wish) {
            return res.status(404).json({ error: 'Wish not found' });
        }

        const isDone = !wish.isDone;
        await wish.update({
            isDone,
            doneAt: isDone ? new Date() : null,
            doneByUserId: isDone ? userId : null,
        });

        res.json({ wish });
    } catch (error) {
        console.error('Toggle wish error:', error);
        res.status(500).json({ error: 'Failed to toggle wish' });
    }
});

/**
 * DELETE /api/wishes/:id
 * Delete own wish
 */
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.userId;
        const wishId = req.params.id;

        const pair = await authService.getUserPair(userId);
        if (!pair) {
            return res.status(400).json({ error: 'Not paired' });
        }

        const wish = await Wish.findOne({
            where: { id: wishId, pairId: pair.id, userId },
        });

        if (!wish) {
            return res.status(404).json({ error: 'Wish not found or not yours' });
        }

        await wish.destroy();
        res.json({ success: true });
    } catch (error) {
        console.error('Delete wish error:', error);
        res.status(500).json({ error: 'Failed to delete wish' });
    }
});

module.exports = router;
