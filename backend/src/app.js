const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config');
const sequelize = require('./config/database');
const redis = require('./config/redis');

// Import routes
const authRoutes = require('./routes/auth');
const loveRoutes = require('./routes/love');
const datesRoutes = require('./routes/dates');
const wishesRoutes = require('./routes/wishes');

// Import middleware
const authMiddleware = require('./middleware/auth');

// Import bot
const { bot } = require('./bot');

// Initialize models
require('./models');

const app = express();

// Middleware
app.use(helmet({
    contentSecurityPolicy: false,
}));
app.use(cors({
    origin: config.nodeEnv === 'production'
        ? config.webappUrl
        : '*',
    credentials: true,
}));
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/love', authMiddleware, loveRoutes);
app.use('/api/dates', authMiddleware, datesRoutes);
app.use('/api/wishes', authMiddleware, wishesRoutes);

// Telegram webhook
app.use('/webhook', bot.webhookCallback('/webhook'));

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: config.nodeEnv === 'production'
            ? 'Internal server error'
            : err.message
    });
});

// Start server
async function start() {
    try {
        // Connect to database
        await sequelize.authenticate();
        console.log('✅ Database connected');

        // Sync models (in dev only)
        if (config.nodeEnv === 'development') {
            await sequelize.sync({ alter: true });
            console.log('✅ Models synced');
        }

        // Connect to Redis
        if (redis) {
            await redis.connect();
        }

        // Start Express server
        app.listen(config.port, () => {
            console.log(`🚀 Server running on port ${config.port}`);
        });

        // Set webhook in production
        if (config.nodeEnv === 'production' && config.webappUrl) {
            const webhookUrl = `${config.webappUrl.replace(/\/$/, '')}/webhook`;
            await bot.telegram.setWebhook(webhookUrl);
            console.log(`✅ Telegram webhook set: ${webhookUrl}`);
        } else {
            // Use polling in development
            bot.launch();
            console.log('✅ Telegram bot started (polling)');
        }
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.once('SIGINT', () => {
    bot.stop('SIGINT');
    process.exit(0);
});
process.once('SIGTERM', () => {
    bot.stop('SIGTERM');
    process.exit(0);
});

start();
