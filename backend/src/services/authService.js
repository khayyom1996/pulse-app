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

        return { pair };
    }
}

module.exports = new AuthService();
