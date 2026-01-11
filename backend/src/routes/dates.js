const express = require('express');
const router = express.Router();
const dateService = require('../services/dateService');
const authService = require('../services/authService');

/**
 * GET /api/dates
 * Get all important dates
 */
router.get('/', async (req, res) => {
    try {
        const userId = req.userId;

        const pair = await authService.getUserPair(userId);
        if (!pair) {
            return res.status(400).json({ error: 'Not paired' });
        }

        const dates = await dateService.getDates(pair.id);
        res.json({ dates });
    } catch (error) {
        console.error('Get dates error:', error);
        res.status(500).json({ error: 'Failed to get dates' });
    }
});

/**
 * GET /api/dates/upcoming
 * Get upcoming dates (next 30 days)
 */
router.get('/upcoming', async (req, res) => {
    try {
        const userId = req.userId;

        const pair = await authService.getUserPair(userId);
        if (!pair) {
            return res.status(400).json({ error: 'Not paired' });
        }

        const dates = await dateService.getUpcomingDates(pair.id);
        res.json({ dates });
    } catch (error) {
        console.error('Get upcoming dates error:', error);
        res.status(500).json({ error: 'Failed to get upcoming dates' });
    }
});

/**
 * POST /api/dates
 * Create new important date
 */
router.post('/', async (req, res) => {
    try {
        const userId = req.userId;
        const { title, description, eventDate, category, reminderDays, isRecurring } = req.body;

        if (!title || !eventDate) {
            return res.status(400).json({ error: 'Title and eventDate are required' });
        }

        const pair = await authService.getUserPair(userId);
        if (!pair) {
            return res.status(400).json({ error: 'Not paired' });
        }

        const date = await dateService.createDate(pair.id, {
            title,
            description,
            eventDate,
            category,
            reminderDays,
            isRecurring,
        });

        res.status(201).json({ date });
    } catch (error) {
        console.error('Create date error:', error);
        res.status(500).json({ error: 'Failed to create date' });
    }
});

/**
 * PUT /api/dates/:id
 * Update important date
 */
router.put('/:id', async (req, res) => {
    try {
        const userId = req.userId;
        const dateId = req.params.id;

        const pair = await authService.getUserPair(userId);
        if (!pair) {
            return res.status(400).json({ error: 'Not paired' });
        }

        const result = await dateService.updateDate(dateId, pair.id, req.body);

        if (result.error) {
            return res.status(404).json({ error: result.error });
        }

        res.json({ date: result.date });
    } catch (error) {
        console.error('Update date error:', error);
        res.status(500).json({ error: 'Failed to update date' });
    }
});

/**
 * DELETE /api/dates/:id
 * Delete important date
 */
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.userId;
        const dateId = req.params.id;

        const pair = await authService.getUserPair(userId);
        if (!pair) {
            return res.status(400).json({ error: 'Not paired' });
        }

        const result = await dateService.deleteDate(dateId, pair.id);

        if (!result.deleted) {
            return res.status(404).json({ error: 'Date not found' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Delete date error:', error);
        res.status(500).json({ error: 'Failed to delete date' });
    }
});

module.exports = router;
