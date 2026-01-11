const authService = require('../services/authService');

/**
 * Authentication middleware
 * Extracts user from initData header and attaches to request
 */
const authMiddleware = async (req, res, next) => {
    try {
        // Skip auth for health check
        if (req.path === '/health') {
            return next();
        }

        const initData = req.headers['x-telegram-init-data'];

        if (!initData) {
            // For development, check for userId header
            if (process.env.NODE_ENV === 'development' && req.headers['x-user-id']) {
                req.userId = parseInt(req.headers['x-user-id']);
                return next();
            }

            return res.status(401).json({ error: 'Authentication required' });
        }

        const telegramUser = authService.validateInitData(initData);
        if (!telegramUser || !telegramUser.id) {
            return res.status(401).json({ error: 'Invalid authentication' });
        }

        // Create or update user in database
        const user = await authService.getOrCreateUser(telegramUser);

        // Attach user ID to request
        req.userId = user.id;
        req.telegramUser = telegramUser;
        req.user = user;

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
};

module.exports = authMiddleware;
