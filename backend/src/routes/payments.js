const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentService');
const authService = require('../services/authService');

/**
 * POST /api/payments/create-invoice
 * Create a Telegram Stars invoice link
 */
router.post('/create-invoice', async (req, res) => {
    try {
        const initData = req.headers['x-telegram-init-data'];
        const { tier } = req.body; // 'monthly' or 'yearly'

        if (!tier) return res.status(400).json({ error: 'Tier is required' });

        const telegramUser = authService.validateInitData(initData);
        if (!telegramUser) return res.status(401).json({ error: 'Unauthorized' });

        const user = await authService.getOrCreateUser(telegramUser);
        const { invoiceLink } = await paymentService.createInvoiceLink(user, tier);

        res.json({ invoiceLink });
    } catch (error) {
        console.error('Create Invoice Error:', error);
        res.status(500).json({ error: 'Failed to create invoice' });
    }
});

/**
 * GET /api/payments/status
 * Check user premium status
 */
router.get('/status', async (req, res) => {
    try {
        const initData = req.headers['x-telegram-init-data'];
        const telegramUser = authService.validateInitData(initData);
        if (!telegramUser) return res.status(401).json({ error: 'Unauthorized' });

        const user = await authService.getOrCreateUser(telegramUser);

        res.json({
            isPremium: user.isPremium,
            premiumUntil: user.premiumUntil,
        });
    } catch (error) {
        console.error('Payment Status Error:', error);
        res.status(500).json({ error: 'Failed to fetch status' });
    }
});

module.exports = router;
