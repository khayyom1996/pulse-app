const { User, Pair, TreeStreak } = require('../models');

class AuthService {
    /**
     * Validate Telegram WebApp init data
     */
    validateInitData(initData) {
        // In production, verify HMAC signature
        // For MVP, we trust the data from Telegram
        try {
            const params = new URLSearchParams(initData);
            const user = JSON.parse(params.get('user') || '{}');
            return user;
        } catch (error) {
            return null;
        }
    }

    /**
     * Get or create user from Telegram data
     * chatId is typically passed separately when user interacts with bot
     */
    async getOrCreateUser(telegramUser, chatId = null, country = null) {
        const [user, created] = await User.findOrCreate({
            where: { id: telegramUser.id },
            defaults: {
                telegramId: telegramUser.id,
                chatId: chatId || telegramUser.id, // Default to user id if no chat id
                username: telegramUser.username,
                firstName: telegramUser.first_name,
                lastName: telegramUser.last_name,
                languageCode: telegramUser.language_code || 'ru',
                country,
            },
        });

        if (!created) {
            // Update user info if changed
            const updates = {
                telegramId: telegramUser.id,
                username: telegramUser.username,
                firstName: telegramUser.first_name,
                lastName: telegramUser.last_name,
                languageCode: telegramUser.language_code || user.languageCode,
            };
            // Update chatId if provided
            if (chatId) {
                updates.chatId = chatId;
            }
            if (country) {
                updates.country = country;
            }



            await user.update(updates);
        } else {

        }

        return user;
    }




    /**
     * Get user's pair
     */
    async getUserPair(userId) {
        // Find pair where user is either user1 or user2
        // Prioritize completed pairs (with pairedAt) over incomplete ones
        const pair = await Pair.findOne({
            where: {
                [require('sequelize').Op.or]: [
                    { user1Id: userId },
                    { user2Id: userId },
                ],
                isActive: true,
            },
            include: [
                { model: User, as: 'user1' },
                { model: User, as: 'user2' },
                { model: TreeStreak },
            ],
            order: [
                // Completed pairs first (those with user2Id)
                [require('sequelize').literal('CASE WHEN "user2_id" IS NOT NULL THEN 0 ELSE 1 END'), 'ASC'],
                ['pairedAt', 'DESC NULLS LAST'],
            ],
        });

        return pair;
    }

    /**
     * Get partner from pair
     */
    getPartner(pair, userId) {
        if (!pair) return null;
        return pair.user1Id === userId ? pair.user2 : pair.user1;
    }

    /**
     * Create new pair with invite code
     */
    async createPair(userId) {
        // Check if user already has a pair
        const existingPair = await this.getUserPair(userId);
        if (existingPair) {
            return { pair: existingPair, isNew: false };
        }

        const inviteCode = Pair.generateInviteCode();
        const pair = await Pair.create({
            user1Id: userId,
            inviteCode,
        });

        // Create tree streak for the pair
        await TreeStreak.create({ pairId: pair.id });

        return { pair, isNew: true };
    }

    /**
     * Join pair with invite code
     */
    async joinPair(userId, inviteCode) {
        const pair = await Pair.findOne({
            where: { inviteCode: inviteCode.toUpperCase(), isActive: true },
        });

        if (!pair) {
            return { error: 'Invalid invite code' };
        }

        if (pair.user2Id) {
            return { error: 'This invite code has already been used' };
        }

        if (pair.user1Id === userId) {
            return { error: 'You cannot join your own pair' };
        }

        // Deactivate any incomplete pairs where this user is user1
        await Pair.update(
            { isActive: false },
            {
                where: {
                    user1Id: userId,
                    user2Id: null,
                    isActive: true,
                },
            }
        );

        await pair.update({
            user2Id: userId,
            pairedAt: new Date(),
        });


        // Sync Pulse Plus status
        const User = require('../models/User');
        const user1 = await User.findByPk(pair.user1Id);
        const user2 = await User.findByPk(userId);

        if (user1 && user2) {
            let sharedPremium = false;
            let maxExpire = null;

            if (user1.isPremium && user1.premiumUntil > new Date()) {
                sharedPremium = true;
                maxExpire = user1.premiumUntil;
            }

            if (user2.isPremium && user2.premiumUntil > new Date()) {
                sharedPremium = true;
                if (!maxExpire || user2.premiumUntil > maxExpire) {
                    maxExpire = user2.premiumUntil;
                }
            }

            if (sharedPremium) {
                // Update both users to have the max expiry date
                await user1.update({ isPremium: true, premiumUntil: maxExpire });
                await user2.update({ isPremium: true, premiumUntil: maxExpire });

                // Try to notify them about shared premium
                try {
                    const { bot } = require('../bot'); // Require bot here to avoid circular dep at top level if any
                    const formattedDate = maxExpire.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
                    const msg = `🎉 *Pulse Plus теперь у вас двоих\\!*\n\nПодписка синхронизирована и активна до *${formattedDate.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&')}* 💎`;

                    if (user1.chatId) await bot.telegram.sendMessage(user1.chatId, msg, { parse_mode: 'MarkdownV2' }).catch(() => { });
                    if (user2.chatId) await bot.telegram.sendMessage(user2.chatId, msg, { parse_mode: 'MarkdownV2' }).catch(() => { });
                } catch (e) {
                    console.error('Failed to notify about shared premium sync:', e);
                }
            }
        }

        return { pair };
    }
}

module.exports = new AuthService();
