const express = require('express');
const router = express.Router();
const dateService = require('../services/dateService');
const authService = require('../services/authService');
const { sendDateNotification } = require('../bot');
const { User } = require('../models');
const { Op } = require('sequelize');

/**
 * GET /api/dates
 * Get all important dates (filtered by visibility)
 */
router.get('/', async (req, res) => {
    try {
        const userId = req.userId;

        const pair = await authService.getUserPair(userId);
        if (!pair) {
            return res.status(400).json({ error: 'Not paired' });
        }

        const dates = await dateService.getDates(pair.id, userId);
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

        const dates = await dateService.getUpcomingDates(pair.id, userId);
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
        const { title, description, eventDate, category, reminderDays, isRecurring, visibility } = req.body;

        if (!title || !eventDate) {
            return res.status(400).json({ error: 'Title and eventDate are required' });
        }

        const pair = await authService.getUserPair(userId);
        if (!pair) {
            return res.status(400).json({ error: 'Not paired' });
        }

        const date = await dateService.createDate(pair.id, userId, {
            title,
            description,
            eventDate,
            category,
            reminderDays,
            isRecurring,
            visibility: visibility || 'both',
        });

        // Send notification to partner (if visibility is 'both')
        const isPublic = visibility !== 'private';
        if (isPublic && pair.user2Id) {
            const partnerId = pair.user1Id === userId ? pair.user2Id : pair.user1Id;
            const creator = await User.findByPk(userId);
            const creatorName = creator?.firstName || 'Ваш партнёр';

            // Send notification asynchronously
            sendDateNotification(partnerId, creatorName, title, eventDate, category).catch(err => {
                console.error('Failed to send date notification:', err.message);
            });
        }

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
