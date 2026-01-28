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
const adminRoutes = require('./routes/admin');
const aiRoutes = require('./routes/ai');
const paymentRoutes = require('./routes/payments');
const rateLimit = require('express-rate-limit');

// Import middleware
const authMiddleware = require('./middleware/auth');

// Import bot
const { bot } = require('./bot');

// Initialize models
require('./models');

// Seed function
async function seedWishCards() {
    const { WishCard } = require('./models');
    const cards = [
        { category: 'romance', textRu: 'Устроить романтический ужин при свечах', textEn: 'Candlelit dinner at home', textTg: 'Шамъҳо барои хӯроки романтикӣ', emoji: '🕯️' },
        { category: 'romance', textRu: 'Написать друг другу любовные письма', textEn: 'Write love letters', textTg: 'Номаҳои муҳаббатӣ навиштан', emoji: '💌' },
        { category: 'romance', textRu: 'Смотреть на звёзды вместе', textEn: 'Stargaze together', textTg: 'Якҷоя ба ситораҳо тамошо кардан', emoji: '⭐' },
        { category: 'romance', textRu: 'Танцевать дома под любимую музыку', textEn: 'Dance at home', textTg: 'Дар хона раққосӣ кардан', emoji: '💃' },
        { category: 'romance', textRu: 'Сделать массаж друг другу', textEn: 'Give each other massages', textTg: 'Ба ҳамдигар массаж кардан', emoji: '💆' },
        { category: 'adventure', textRu: 'Поехать в спонтанное путешествие', textEn: 'Spontaneous trip', textTg: 'Саёҳати ногаҳонӣ', emoji: '🚗' },
        { category: 'adventure', textRu: 'Попробовать экстремальный спорт', textEn: 'Try extreme sport', textTg: 'Варзиши экстремалӣ', emoji: '🪂' },
        { category: 'adventure', textRu: 'Провести ночь под открытым небом', textEn: 'Sleep under the stars', textTg: 'Шаб зери осмон', emoji: '⛺' },
        { category: 'adventure', textRu: 'Научиться чему-то новому вместе', textEn: 'Learn something new', textTg: 'Чизи нав омӯхтан', emoji: '📚' },
        { category: 'adventure', textRu: 'Устроить фотосессию вместе', textEn: 'Photoshoot together', textTg: 'Якҷоя аксбардорӣ', emoji: '📸' },
        { category: 'leisure', textRu: 'Сходить в кино на премьеру', textEn: 'Movie premiere', textTg: 'Ба кино рафтан', emoji: '🍿' },
        { category: 'leisure', textRu: 'Поиграть в настольные игры', textEn: 'Board game night', textTg: 'Бозии мизӣ бозидан', emoji: '🎲' },
        { category: 'leisure', textRu: 'Посетить спа вместе', textEn: 'Spa day together', textTg: 'Якҷоя ба спа рафтан', emoji: '🧖' },
        { category: 'leisure', textRu: 'Марафон любимого сериала', textEn: 'TV series marathon', textTg: 'Марафони филмҳо', emoji: '📺' },
        { category: 'leisure', textRu: 'Пойти на концерт', textEn: 'Go to a concert', textTg: 'Ба консерт рафтан', emoji: '🎤' },
    ];
    for (let i = 0; i < cards.length; i++) {
        await WishCard.create({ ...cards[i], sortOrder: i });
    }
    console.log(`✅ Seeded ${cards.length} wish cards`);
}

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

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
});

// Apply limiter to all API routes
app.use('/api/', limiter);

// More strict limiter for auth routes
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // limit each IP to 20 requests per windowMs
    message: { error: 'Too many login attempts, please try again in an hour.' }
});
app.use('/api/auth/login', authLimiter);

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
app.use('/api/admin', adminRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);
app.use('/api/payments', authMiddleware, paymentRoutes);

// Admin: Force seed wish cards
app.post('/api/admin/seed-cards', async (req, res) => {
    try {
        const { WishCard } = require('./models');
        const count = await WishCard.count();
        if (count > 0) {
            return res.json({ message: `Already have ${count} cards`, seeded: false });
        }
        await seedWishCards();
        const newCount = await WishCard.count();
        res.json({ message: `Seeded ${newCount} cards`, seeded: true });
    } catch (error) {
        console.error('Seed error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Telegram webhook
app.use('/webhook', bot.webhookCallback('/'));

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

        // Sync models
        await sequelize.sync({ alter: true });
        console.log('✅ Models synced');

        // Auto-seed if no wish cards exist
        const { WishCard } = require('./models');
        const count = await WishCard.count();
        if (count === 0) {
            console.log('📦 No wish cards found, seeding...');
            await seedWishCards();
        }

        // Connect to Redis
        if (redis) {
            await redis.connect();
        }

        // Start reminder job
        const { startReminderJob } = require('./jobs/reminderJob');
        startReminderJob();

        // Start Express server
        app.listen(config.port, () => {
            console.log(`🚀 Server running on port ${config.port}`);
        });

        // Set webhook in production
        if (config.nodeEnv === 'production' && config.apiUrl) {
            const webhookUrl = `${config.apiUrl.replace(/\/$/, '')}/webhook`;
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
