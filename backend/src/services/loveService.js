const { LoveClick, TreeStreak } = require('../models');
const redis = require('../config/redis');

class LoveService {
    /**
     * Send love to partner
     * Returns: { success, message, shouldNotify, cooldownRemaining }
     */
    async sendLove(pairId, senderId, receiverId, message = null, isPremium = false) {
        // Feature gating: free users can only send love once a day
        if (!isPremium) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const todayClicks = await LoveClick.count({
                where: {
                    senderId,
                    createdAt: {
                        [require('sequelize').Op.gte]: today,
                    },
                },
            });

            if (todayClicks >= 1) {
                return {
                    success: false,
                    error: 'limit_reached',
                    message: 'Free users can only send love once a day. Upgrade to Pulse Plus for unlimited love!',
                };
            }
        }

        // Check cooldown (5 seconds between clicks)
        const cooldownKey = `love_cooldown:${senderId}`;

        if (redis) {
            const cooldown = await redis.get(cooldownKey);
            if (cooldown) {
                const remaining = await redis.ttl(cooldownKey);
                return {
                    success: false,
                    error: 'cooldown',
                    cooldownRemaining: remaining,
                };
            }
        }

        // Create love click record
        const loveClick = await LoveClick.create({
            pairId,
            senderId,
            receiverId,
            message,
        });

        // Set cooldown
        if (redis) {
            await redis.set(cooldownKey, '1', 'EX', 5);
        }

        // Update streak
        await this.updateStreak(pairId);

        return {
            success: true,
            loveClick,
            shouldNotify: true,
        };
    }

    /**
     * Get love history for pair
     */
    async getLoveHistory(pairId, limit = 50) {
        const clicks = await LoveClick.findAll({
            where: { pairId },
            order: [['createdAt', 'DESC']],
            limit,
        });

        return clicks;
    }

    /**
     * Get today's love stats
     */
    async getTodayStats(pairId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const count = await LoveClick.count({
            where: {
                pairId,
                createdAt: {
                    [require('sequelize').Op.gte]: today,
                },
            },
        });

        return { today: count };
    }

    /**
     * Update pair streak
     */
    async updateStreak(pairId) {
        const streak = await TreeStreak.findOne({ where: { pairId } });
        if (!streak) return;

        const today = new Date().toISOString().split('T')[0];
        const lastDate = streak.lastInteractionDate;

        if (lastDate === today) {
            // Already interacted today
            return streak;
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        let newStreak = streak.currentStreak;

        if (lastDate === yesterdayStr) {
            // Consecutive day
            newStreak += 1;
        } else if (lastDate !== today) {
            // Streak broken, reset to 1
            newStreak = 1;
        }

        const newLevel = TreeStreak.calculateLevel(newStreak);
        const newMax = Math.max(streak.maxStreak, newStreak);

        await streak.update({
            currentStreak: newStreak,
            maxStreak: newMax,
            treeLevel: newLevel,
            lastInteractionDate: today,
            totalInteractions: streak.totalInteractions + 1,
        });

        return streak;
    }
}

module.exports = new LoveService();
