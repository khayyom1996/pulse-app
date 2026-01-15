const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const authMiddleware = require('../middleware/auth');

const geoip = require('geoip-lite');

/**
 * POST /api/auth/login
 * Authenticate user with Telegram WebApp initData
 */
router.post('/login', async (req, res) => {
    try {
        const { initData } = req.body;

        if (!initData) {
            return res.status(400).json({ error: 'initData is required' });
        }

        const telegramUser = authService.validateInitData(initData);
        if (!telegramUser || !telegramUser.id) {
            return res.status(401).json({ error: 'Invalid initData' });
        }

        // Get IP and country
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        let country = null;

        if (ip) {
            // Handle X-Forwarded-For which can be a comma-separated list
            const cleanIp = ip.split(',')[0].trim();
            const geo = geoip.lookup(cleanIp);
            if (geo) {
                country = geo.country;
            }
        }

        const user = await authService.getOrCreateUser(telegramUser, null, country);
        const pair = await authService.getUserPair(user.id);
        const partner = authService.getPartner(pair, user.id);

        res.json({
            user: {
                id: user.id,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                languageCode: user.languageCode,
                isPremium: user.isPremium,
            },
            pair: pair ? {
                id: pair.id,
                inviteCode: pair.inviteCode,
                pairedAt: pair.pairedAt,
                isComplete: !!pair.user2Id,
                streak: pair.TreeStreak ? {
                    current: pair.TreeStreak.currentStreak,
                    max: pair.TreeStreak.maxStreak,
                    level: pair.TreeStreak.treeLevel,
                } : null,
            } : null,
            partner: partner ? {
                id: partner.id,
                firstName: partner.firstName,
                username: partner.username,
            } : null,
        });
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

/**
 * POST /api/auth/create-pair
 * Create new pair with invite code
 */
router.post('/create-pair', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const { pair, isNew } = await authService.createPair(userId);

        res.json({
            pair: {
                id: pair.id,
                inviteCode: pair.inviteCode,
                isComplete: !!pair.user2Id,
            },
            isNew,
        });
    } catch (error) {
        console.error('Create pair error:', error);
        res.status(500).json({ error: 'Failed to create pair' });
    }
});

/**
 * POST /api/auth/join-pair
 * Join existing pair with invite code
 */
router.post('/join-pair', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const { inviteCode } = req.body;

        if (!inviteCode) {
            return res.status(400).json({ error: 'Invite code is required' });
        }

        const result = await authService.joinPair(userId, inviteCode);

        if (result.error) {
            return res.status(400).json({ error: result.error });
        }

        res.json({
            pair: {
                id: result.pair.id,
                pairedAt: result.pair.pairedAt,
            },
            success: true,
        });
    } catch (error) {
        console.error('Join pair error:', error);
        res.status(500).json({ error: 'Failed to join pair' });
    }
});

module.exports = router;
