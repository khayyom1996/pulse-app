const express = require('express');
const router = express.Router();
const { User, Pair, LoveClick, ImportantDate, WishMatch, WishSwipe, TreeStreak } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { bot } = require('../bot');

// Simple admin auth middleware (use proper auth in production)
const adminAuth = (req, res, next) => {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

/**
 * GET /api/admin/stats
 * Get dashboard statistics
 */
router.get('/stats', adminAuth, async (req, res) => {
    try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        // User stats
        const totalUsers = await User.count();
        const usersToday = await User.count({ where: { createdAt: { [Op.gte]: today } } });
        const usersWeek = await User.count({ where: { createdAt: { [Op.gte]: weekAgo } } });
        const usersMonth = await User.count({ where: { createdAt: { [Op.gte]: monthAgo } } });

        // Pair stats
        const totalPairs = await Pair.count({ where: { user2Id: { [Op.not]: null } } });
        const activePairs = await Pair.count({ where: { isActive: true, user2Id: { [Op.not]: null } } });
        const pendingPairs = await Pair.count({ where: { user2Id: null, isActive: true } });

        // Activity stats
        const totalLoveClicks = await LoveClick.count();
        const loveTodayCount = await LoveClick.count({ where: { createdAt: { [Op.gte]: today } } });
        const loveWeekCount = await LoveClick.count({ where: { createdAt: { [Op.gte]: weekAgo } } });

        // Engagement stats
        const totalDates = await ImportantDate.count();
        const totalMatches = await WishMatch.count();
        const totalSwipes = await WishSwipe.count();

        // Streak stats
        const avgStreak = await TreeStreak.findOne({
            attributes: [[sequelize.fn('AVG', sequelize.col('current_streak')), 'avgStreak']],
        });

        res.json({
            users: {
                total: totalUsers,
                today: usersToday,
                week: usersWeek,
                month: usersMonth,
            },
            pairs: {
                total: totalPairs,
                active: activePairs,
                pending: pendingPairs,
            },
            activity: {
                totalLoveClicks,
                loveToday: loveTodayCount,
                loveWeek: loveWeekCount,
                avgPerDay: Math.round(loveWeekCount / 7),
            },
            engagement: {
                totalDates,
                totalMatches,
                totalSwipes,
                avgStreak: Math.round(avgStreak?.dataValues?.avgStreak || 0),
            },
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

/**
 * GET /api/admin/users
 * Get user list with pagination
 */
router.get('/users', adminAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        const { count, rows } = await User.findAndCountAll({
            order: [['createdAt', 'DESC']],
            limit,
            offset,
            attributes: ['id', 'telegramId', 'username', 'firstName', 'lastName', 'languageCode', 'createdAt'],
        });

        res.json({
            users: rows,
            pagination: {
                total: count,
                page,
                pages: Math.ceil(count / limit),
            },
        });
    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
});

/**
 * GET /api/admin/chart/users
 * Get user registration chart data (last 30 days)
 */
router.get('/chart/users', adminAuth, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const data = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const count = await User.count({
                where: {
                    createdAt: {
                        [Op.gte]: date,
                        [Op.lt]: nextDate,
                    },
                },
            });

            data.push({
                date: date.toISOString().split('T')[0],
                count,
            });
        }

        res.json({ data });
    } catch (error) {
        console.error('Admin chart error:', error);
        res.status(500).json({ error: 'Failed to get chart data' });
    }
});

/**
 * GET /api/admin/chart/activity
 * Get activity chart data (love clicks per day)
 */
router.get('/chart/activity', adminAuth, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 14;
        const data = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const loveClicks = await LoveClick.count({
                where: {
                    createdAt: {
                        [Op.gte]: date,
                        [Op.lt]: nextDate,
                    },
                },
            });

            const swipes = await WishSwipe.count({
                where: {
                    createdAt: {
                        [Op.gte]: date,
                        [Op.lt]: nextDate,
                    },
                },
            });

            data.push({
                date: date.toISOString().split('T')[0],
                loveClicks,
                swipes,
            });
        }

        res.json({ data });
    } catch (error) {
        console.error('Admin activity chart error:', error);
        res.status(500).json({ error: 'Failed to get activity data' });
    }
});

/**
 * POST /api/admin/broadcast
 * Send broadcast message to users
 */
router.post('/broadcast', adminAuth, async (req, res) => {
    try {
        const { message, targetGroup, imageUrl } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        let users;

        // Target group filter
        switch (targetGroup) {
            case 'paired':
                // Users who are in completed pairs
                const pairedUserIds = await Pair.findAll({
                    where: { user2Id: { [Op.not]: null }, isActive: true },
                    attributes: ['user1Id', 'user2Id'],
                });
                const ids = pairedUserIds.flatMap(p => [p.user1Id, p.user2Id]);
                users = await User.findAll({ where: { id: { [Op.in]: ids } } });
                break;
            case 'unpaired':
                // Users not in any completed pair
                const allPairedIds = await Pair.findAll({
                    where: { user2Id: { [Op.not]: null }, isActive: true },
                    attributes: ['user1Id', 'user2Id'],
                });
                const excludeIds = allPairedIds.flatMap(p => [p.user1Id, p.user2Id]);
                users = await User.findAll({ where: { id: { [Op.notIn]: excludeIds } } });
                break;
            case 'active':
                // Users active in last 7 days
                const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                const activeUserIds = await LoveClick.findAll({
                    where: { createdAt: { [Op.gte]: weekAgo } },
                    attributes: [[sequelize.fn('DISTINCT', sequelize.col('sender_id')), 'senderId']],
                    raw: true,
                });
                users = await User.findAll({
                    where: { id: { [Op.in]: activeUserIds.map(u => u.senderId) } }
                });
                break;
            default:
                users = await User.findAll();
        }

        let sent = 0;
        let failed = 0;

        for (const user of users) {
            try {
                if (imageUrl) {
                    await bot.telegram.sendPhoto(user.telegramId, imageUrl, {
                        caption: message,
                        parse_mode: 'Markdown',
                    });
                } else {
                    await bot.telegram.sendMessage(user.telegramId, message, {
                        parse_mode: 'Markdown',
                    });
                }
                sent++;
                // Rate limiting
                await new Promise(r => setTimeout(r, 50));
            } catch (err) {
                failed++;
                console.error(`Failed to send to ${user.telegramId}:`, err.message);
            }
        }

        res.json({
            success: true,
            stats: { sent, failed, total: users.length },
        });
    } catch (error) {
        console.error('Broadcast error:', error);
        res.status(500).json({ error: 'Broadcast failed' });
    }
});

/**
 * GET /api/admin/broadcasts
 * Get broadcast history (would need a BroadcastLog model in production)
 */
router.get('/top-users', adminAuth, async (req, res) => {
    try {
        const topSenders = await LoveClick.findAll({
            attributes: [
                'senderId',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
            ],
            group: ['senderId'],
            order: [[sequelize.literal('count'), 'DESC']],
            limit: 10,
            raw: true,
        });

        const userIds = topSenders.map(s => s.senderId);
        const users = await User.findAll({
            where: { id: { [Op.in]: userIds } },
            attributes: ['id', 'firstName', 'lastName', 'username'],
        });

        const result = topSenders.map(s => {
            const user = users.find(u => u.id === s.senderId);
            return {
                user: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Unknown',
                count: parseInt(s.count),
            };
        });

        res.json({ topUsers: result });
    } catch (error) {
        console.error('Top users error:', error);
        res.status(500).json({ error: 'Failed to get top users' });
    }
});

module.exports = router;
