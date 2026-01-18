const { Payment, User } = require('../models');
const { bot } = require('../bot');
const crypto = require('crypto');

class PaymentService {
    /**
     * Create an invoice link for Telegram Stars
     */
    async createInvoiceLink(user, tier) {
        let price = 0;
        let durationDays = 0;
        let title = '';
        let description = '';

        if (tier === 'monthly') {
            price = 150; // 150 Telegram Stars
            durationDays = 30;
            title = 'Pulse Plus - 1 Month';
            description = 'Premium features for 1 month: unlimited AI psychologist, more dates, and unlimited wish matching.';
        } else if (tier === 'six_months') {
            price = 699; // 699 Telegram Stars
            durationDays = 180;
            title = 'Pulse Plus - 6 Months';
            description = 'Premium features for 6 months (save 22%): unlimited AI psychologist, more dates, and exclusive tree levels.';
        } else if (tier === 'yearly') {
            price = 999; // 999 Telegram Stars
            durationDays = 365;
            title = 'Pulse Plus - 1 Year';
            description = 'Premium features for 12 months (save 45%): everything unlimited and advance date notifications.';
        } else {
            throw new Error('Invalid subscription tier');
        }

        // Apply discount if user has one
        if (user.discount > 0) {
            price = Math.round(price * (1 - user.discount / 100));
            description += ` (Applied ${user.discount}% discount!)`;

            // Note: We might want to clear the discount after successful payment or keep it.
            // For now, let's keep it until payment is successful.
        }

        const payload = crypto.randomBytes(16).toString('hex');

        // Store pending payment
        await Payment.create({
            userId: user.id,
            amount: price,
            payload,
            status: 'pending',
        });

        const invoiceLink = await bot.telegram.createInvoiceLink({
            title,
            description,
            payload,
            provider_token: '', // Empty for Telegram Stars
            currency: 'XTR',
            prices: [{ label: title, amount: price }],
        });

        return { invoiceLink, payload };
    }

    /**
     * Complete a payment and grant premium status
     */
    async handleSuccessfulPayment(payload, chargeId) {
        const payment = await Payment.findOne({ where: { payload } });
        if (!payment) {
            console.error('Payment not found for payload:', payload);
            return;
        }

        if (payment.status === 'completed') {
            return; // Already processed
        }

        // Update payment record
        await payment.update({
            status: 'completed',
            telegramPaymentChargeId: chargeId,
        });

        // Update user premium status
        const user = await User.findByPk(payment.userId);
        if (user) {
            let durationDays = 30;
            if (payment.amount === 999) durationDays = 365;
            else if (payment.amount === 699) durationDays = 180;

            const currentExpire = user.premiumUntil && user.premiumUntil > new Date()
                ? user.premiumUntil
                : new Date();

            const newExpire = new Date(currentExpire.getTime() + durationDays * 24 * 60 * 60 * 1000);

            await user.update({
                isPremium: true,
                premiumUntil: newExpire,
                discount: 0,
                appliedPromoCode: null
            });

            // Notify user via bot
            try {
                await bot.telegram.sendMessage(user.chatId || user.id,
                    `🎉 Поздравляем! Подписка Pulse Plus активирована до ${newExpire.toLocaleDateString('ru-RU')}.`
                );
            } catch (e) {
                console.error('Failed to send payment notification:', e);
            }
        }
    }
}

module.exports = new PaymentService();
