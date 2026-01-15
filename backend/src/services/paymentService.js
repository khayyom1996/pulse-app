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
            price = 150; // 150 Telegram Stars (~$2.99)
            durationDays = 30;
            title = 'Pulse Plus - 1 Month';
            description = 'Premium features for 1 month: exclusive tree levels, unlimited wishes matching, and AI therapist.';
        } else if (tier === 'yearly') {
            price = 999; // 999 Telegram Stars (~$19.99)
            durationDays = 365;
            title = 'Pulse Plus - 1 Year';
            description = 'Premium features for 1 year: exclusive tree levels, unlimited wishes matching, and AI therapist.';
        } else {
            throw new Error('Invalid subscription tier');
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
            let durationDays = payment.amount === 999 ? 365 : 30;

            const currentExpire = user.premiumUntil && user.premiumUntil > new Date()
                ? user.premiumUntil
                : new Date();

            const newExpire = new Date(currentExpire.getTime() + durationDays * 24 * 60 * 60 * 1000);

            await user.update({
                isPremium: true,
                premiumUntil: newExpire,
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
