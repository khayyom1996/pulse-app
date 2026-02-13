const express = require('express');
const router = express.Router();
const { User, Pair, LoveClick, ImportantDate, WishMatch, WishSwipe, TreeStreak, PromoCode, AppSetting } = require('../models');
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

        // Efficiently fetch all stats in parallel
        const [
            totalUsers, usersToday, usersWeek, usersMonth,
            totalPairs, activePairs, pendingPairs,
            totalLoveClicks, loveTodayCount, loveWeekCount,
            totalDates, totalMatches, totalSwipes,
            avgStreak
        ] = await Promise.all([
            User.count(),
            User.count({ where: { createdAt: { [Op.gte]: today } } }),
            User.count({ where: { createdAt: { [Op.gte]: weekAgo } } }),
            User.count({ where: { createdAt: { [Op.gte]: monthAgo } } }),
            Pair.count({ where: { user2Id: { [Op.not]: null } } }),
            Pair.count({ where: { isActive: true, user2Id: { [Op.not]: null } } }),
            Pair.count({ where: { user2Id: null, isActive: true } }),
            LoveClick.count(),
            LoveClick.count({ where: { createdAt: { [Op.gte]: today } } }),
            LoveClick.count({ where: { createdAt: { [Op.gte]: weekAgo } } }),
            ImportantDate.count(),
            WishMatch.count(),
            WishSwipe.count(),
            TreeStreak.findOne({
                attributes: [[sequelize.fn('AVG', sequelize.col('current_streak')), 'avgStreak']],
            })
        ]);

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
            attributes: ['id', 'telegramId', 'username', 'firstName', 'lastName', 'languageCode', 'country', 'createdAt'],
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
        const promises = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            promises.push(
                User.count({
                    where: {
                        createdAt: {
                            [Op.gte]: date,
                            [Op.lt]: nextDate,
                        },
                    },
                }).then(count => ({
                    date: date.toISOString().split('T')[0],
                    count,
                }))
            );
        }

        const data = await Promise.all(promises);

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
        const promises = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            promises.push(
                (async () => {
                    const [loveClicks, swipes] = await Promise.all([
                        LoveClick.count({
                            where: {
                                createdAt: { [Op.gte]: date, [Op.lt]: nextDate },
                            },
                        }),
                        WishSwipe.count({
                            where: {
                                createdAt: { [Op.gte]: date, [Op.lt]: nextDate },
                            },
                        })
                    ]);
                    return {
                        date: date.toISOString().split('T')[0],
                        loveClicks,
                        swipes,
                    };
                })()
            );
        }

        const data = await Promise.all(promises);

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
                // Use chatId if available, fallback to user.id
                const targetChatId = user.chatId || user.id;
                if (!targetChatId) {
                    failed++;
                    continue;
                }

                if (imageUrl) {
                    await bot.telegram.sendPhoto(targetChatId, imageUrl, {
                        caption: message,
                        parse_mode: 'Markdown',
                    });
                } else {
                    await bot.telegram.sendMessage(targetChatId, message, {
                        parse_mode: 'Markdown',
                    });
                }
                sent++;
                // Rate limiting
                await new Promise(r => setTimeout(r, 50));
            } catch (err) {
                failed++;
                console.error(`Failed to send to ${user.chatId || user.id}:`, err.message);
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

/**
 * DELETE /api/admin/clear-data
 * Clear all data from database (DANGEROUS!)
 */
router.delete('/clear-data', adminAuth, async (req, res) => {
    try {
        const { confirm } = req.body;

        if (confirm !== 'DELETE_ALL_DATA') {
            return res.status(400).json({ error: 'Confirm with DELETE_ALL_DATA' });
        }

        // Delete in correct order (foreign key constraints)
        await LoveClick.destroy({ where: {}, truncate: true, cascade: true });
        await WishSwipe.destroy({ where: {}, truncate: true, cascade: true });
        await WishMatch.destroy({ where: {}, truncate: true, cascade: true });
        await ImportantDate.destroy({ where: {}, truncate: true, cascade: true });
        await TreeStreak.destroy({ where: {}, truncate: true, cascade: true });
        await Pair.destroy({ where: {}, truncate: true, cascade: true });
        await User.destroy({ where: {}, truncate: true, cascade: true });

        console.log('⚠️ All data cleared by admin');

        res.json({ success: true, message: 'All data cleared' });
    } catch (error) {
        console.error('Clear data error:', error);
        res.status(500).json({ error: 'Failed to clear data: ' + error.message });
    }
});

/**
 * GET /api/admin/promo-codes
 */
router.get('/promo-codes', adminAuth, async (req, res) => {
    try {
        const promoCodes = await PromoCode.findAll({
            order: [['createdAt', 'DESC']],
        });
        res.json({ promoCodes });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get promo codes' });
    }
});

/**
 * POST /api/admin/promo-codes
 */
router.post('/promo-codes', adminAuth, async (req, res) => {
    try {
        const { code, type, value, usageLimit, expiresAt } = req.body;
        const promoCode = await PromoCode.create({
            code: code.toUpperCase(),
            type,
            value,
            usageLimit: usageLimit || null,
            expiresAt: expiresAt || null,
        });
        res.json({ promoCode });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/admin/promo-codes/:id
 */
router.delete('/promo-codes/:id', adminAuth, async (req, res) => {
    try {
        await PromoCode.destroy({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete promo code' });
    }
});

// =============================================
// APP SETTINGS ENDPOINTS
// =============================================

/**
 * GET /api/admin/settings
 * Get all app settings
 */
router.get('/settings', adminAuth, async (req, res) => {
    try {
        const settings = await AppSetting.findAll();
        const settingsMap = {};
        settings.forEach(s => { settingsMap[s.key] = s.value; });

        // Return with defaults
        res.json({
            ai_enabled: settingsMap.ai_enabled || 'false',
            ai_daily_limit: settingsMap.ai_daily_limit || '3',
            pricing_monthly: settingsMap.pricing_monthly || '299',
            pricing_6month: settingsMap.pricing_6month || '999',
            pricing_yearly: settingsMap.pricing_yearly || '1499',
            pricing_discount: settingsMap.pricing_discount || '0',
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get settings' });
    }
});

/**
 * PUT /api/admin/settings
 * Update app settings (batch)
 */
router.put('/settings', adminAuth, async (req, res) => {
    try {
        const updates = req.body;

        const allowedKeys = [
            'ai_enabled', 'ai_daily_limit',
            'pricing_monthly', 'pricing_6month', 'pricing_yearly', 'pricing_discount',
        ];

        for (const [key, value] of Object.entries(updates)) {
            if (!allowedKeys.includes(key)) continue;
            await AppSetting.upsert({ key, value: String(value) });
        }

        // Return updated settings
        const settings = await AppSetting.findAll();
        const settingsMap = {};
        settings.forEach(s => { settingsMap[s.key] = s.value; });

        res.json({
            ai_enabled: settingsMap.ai_enabled || 'false',
            ai_daily_limit: settingsMap.ai_daily_limit || '3',
            pricing_monthly: settingsMap.pricing_monthly || '299',
            pricing_6month: settingsMap.pricing_6month || '999',
            pricing_yearly: settingsMap.pricing_yearly || '1499',
            pricing_discount: settingsMap.pricing_discount || '0',
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

module.exports = router;
