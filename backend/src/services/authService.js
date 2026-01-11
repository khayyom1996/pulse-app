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
     */
    async getOrCreateUser(telegramUser) {
        const [user, created] = await User.findOrCreate({
            where: { id: telegramUser.id },
            defaults: {
                username: telegramUser.username,
                firstName: telegramUser.first_name,
                lastName: telegramUser.last_name,
                languageCode: telegramUser.language_code || 'ru',
            },
        });

        if (!created) {
            // Update user info if changed
            await user.update({
                username: telegramUser.username,
                firstName: telegramUser.first_name,
                lastName: telegramUser.last_name,
                languageCode: telegramUser.language_code || user.languageCode,
            });
        }

        return user;
    }

    /**
     * Get user's pair
     */
    async getUserPair(userId) {
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

        await pair.update({
            user2Id: userId,
            pairedAt: new Date(),
        });

        return { pair };
    }
}

module.exports = new AuthService();
