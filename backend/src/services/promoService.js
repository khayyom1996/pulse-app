const { PromoCode, User } = require('../models');
const { Op } = require('sequelize');

class PromoService {
    /**
     * Validate a promo code
     */
    async validateCode(code) {
        const promo = await PromoCode.findOne({
            where: {
                code: code.toUpperCase(),
                isActive: true,
            }
        });

        if (!promo) {
            return { error: 'invalid_code' };
        }

        if (promo.usageLimit !== null && promo.timesUsed >= promo.usageLimit) {
            return { error: 'limit_reached' };
        }

        if (promo.expiresAt && new Date() > promo.expiresAt) {
            return { error: 'expired' };
        }

        return { promo };
    }

    /**
     * Apply promo code to a user
     */
    async applyCode(userId, code) {
        const { promo, error } = await this.validateCode(code);
        if (error) return { error };

        const user = await User.findByPk(userId);
        if (!user) return { error: 'user_not_found' };

        if (promo.type === 'premium') {
            const daysToAdd = promo.value;
            const currentPremiumUntil = user.premiumUntil && new Date(user.premiumUntil) > new Date()
                ? new Date(user.premiumUntil)
                : new Date();

            const newPremiumUntil = new Date(currentPremiumUntil.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

            await user.update({
                isPremium: true,
                premiumUntil: newPremiumUntil,
                appliedPromoCode: promo.code
            });

            // Increment usage
            await promo.increment('timesUsed');

            return { success: true, type: 'premium', days: daysToAdd };
        }

        if (promo.type === 'discount') {
            await user.update({
                discount: promo.value,
                appliedPromoCode: promo.code
            });

            // Increment usage
            await promo.increment('timesUsed');

            return { success: true, type: 'discount', discount: promo.value };
        }

        return { error: 'unknown_type' };
    }
}

module.exports = new PromoService();
