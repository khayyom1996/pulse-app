const express = require('express');
const router = express.Router();
const wishService = require('../services/wishService');
const authService = require('../services/authService');

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

module.exports = router;
