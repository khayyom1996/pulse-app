const { Payment, User, AppSetting } = require('../models');
const { bot } = require('../bot');
const crypto = require('crypto');

class PaymentService {
    /**
     * Create an invoice link for Telegram Stars
     */
    async createInvoiceLink(user, tier) {
        // Fetch prices from admin settings
        const settings = await AppSetting.findAll();
        const s = {};
        settings.forEach(item => { s[item.key] = item.value; });

        const pricingMonthly = parseInt(s.pricing_monthly || '299');

        // Calculate other prices based on monthly price (as requested)
        // 6 months: ~22% discount
        const pricing6month = Math.floor(pricingMonthly * 6 * 0.78);
        // Yearly: ~45% discount
        const pricingYearly = Math.floor(pricingMonthly * 12 * 0.55);

        const globalDiscount = parseInt(s.pricing_discount || '0');

        let price = 0;
        let durationDays = 0;
        let title = '';
        let description = '';

        if (tier === 'monthly') {
            price = pricingMonthly;
            durationDays = 30;
            title = 'Pulse Plus - 1 Month';
            description = 'Premium features for 1 month: unlimited AI psychologist, more dates, and unlimited wish matching.';
        } else if (tier === 'six_months') {
            price = pricing6month;
            durationDays = 180;
            title = 'Pulse Plus - 6 Months';
            description = 'Premium features for 6 months: unlimited AI psychologist, more dates, and exclusive tree levels.';
        } else if (tier === 'yearly') {
            price = pricingYearly;
            durationDays = 365;
            title = 'Pulse Plus - 1 Year';
            description = 'Premium features for 12 months: everything unlimited and advance date notifications.';
        } else {
            throw new Error('Invalid subscription tier');
        }

        // Apply global discount from admin settings, or user-specific discount
        const discount = globalDiscount > 0 ? globalDiscount : (user.discount || 0);
        if (discount > 0) {
            price = Math.round(price * (1 - discount / 100));
            description += ` (Applied ${discount}% discount!)`;
        }

        const payload = crypto.randomBytes(16).toString('hex');

        // Store pending payment
        await Payment.create({
            userId: user.id,
            amount: price,
            payload,
            tier,
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
            if (payment.tier === 'yearly') durationDays = 365;
            else if (payment.tier === 'six_months') durationDays = 180;

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

            // Notify user via bot with features info and open button
            try {
                const config = require('../config');
                const formattedDate = newExpire.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
                const message = `🎉 *Поздравляем\\! Подписка Pulse Plus активирована\\!*

📅 Активна до: *${formattedDate.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&')}*

Теперь вам доступно:
🧠 *ИИ Психолог* — безлимитное общение и советы
🌳 *Эксклюзивные деревья* — новые уровни и формы
✨ *Тайные желания* — безлимитные совпадения
❤️ *Безлимитная любовь* — без ограничений
📅 *Продвинутые даты* — расширенные напоминания
🔔 *Приоритетные уведомления* — никогда не пропустите

Наслаждайтесь Pulse Plus\\! 💎`;

                await bot.telegram.sendMessage(user.chatId || user.id, message, {
                    parse_mode: 'MarkdownV2',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '💕 Открыть Pulse', web_app: { url: config.webappUrl } }],
                        ],
                    },
                });
            } catch (e) {
                console.error('Failed to send payment notification:', e);
            }
        }

        // Share premium with partner
        try {
            // Require inside method to assume initialized
            const authService = require('./authService');
            const pair = await authService.getUserPair(user.id);

            if (pair) {
                const partner = authService.getPartner(pair, user.id);
                if (partner) {
                    await partner.update({
                        isPremium: true,
                        premiumUntil: newExpire,
                        discount: 0
                    });

                    // Notify partner
                    try {
                        const formattedDate = newExpire.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
                        const partnerMsg = `🎉 *Pulse Plus активирован для вашей пары\\!*\n\nВаш партнёр оформил подписку, и теперь она доступна вам обоим до *${formattedDate.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&')}*\\! 💎`;

                        const config = require('../config');
                        await bot.telegram.sendMessage(partner.chatId || partner.id, partnerMsg, {
                            parse_mode: 'MarkdownV2',
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: '💕 Открыть Pulse', web_app: { url: config.webappUrl } }],
                                ],
                            },
                        });
                    } catch (e) {
                        console.error('Failed to notify partner about premium:', e);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to share premium with partner:', error);
        }
    }
}

module.exports = new PaymentService();
