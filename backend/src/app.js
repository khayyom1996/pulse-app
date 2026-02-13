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
app.set('trust proxy', 1); // Enable proxy trust for Railway/Cloudflare

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // limit each IP to 300 requests per windowMs (Increased for Launch)
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

// Health check and root routes
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Pulse API is running' });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        database: sequelize.options.host,
    });
});

// Start server immediately
const PORT = config.port || 8080;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${config.nodeEnv}`);

    // Initialize services in background
    startServices();
});

async function startServices() {
    // 1. Connect to Redis (optional)
    try {
        if (redis) {
            console.log('📡 Connecting to Redis...');
            // ioredis usually connects automatically unless lazyConnect: true
            // We can trigger a ping to verify
            await redis.ping();
            console.log('✅ Redis connected');
        }
    } catch (error) {
        console.error('❌ Redis initialization failed:', error.message);
    }

    // 2. Connect to database
    let retries = 10;
    let currentHost = sequelize.options.host;
    while (retries > 0) {
        try {
            const dbPort = sequelize.options.port;
            console.log(`📡 Attempting to connect to database at ${currentHost}:${dbPort}... (Retries left: ${retries})`);

            // Set a manual timeout for authentication to avoid indefinite hang
            const authPromise = sequelize.authenticate();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Manual connection timeout')), 30000)
            );

            await Promise.race([authPromise, timeoutPromise]);
            console.log('✅ Database connected');

            // Sync models
            await sequelize.sync({ alter: config.nodeEnv === 'development' });
            console.log('✅ Models synced');

            // Auto-seed if no wish cards exist
            const { WishCard } = require('./models');
            const count = await WishCard.count();
            if (count === 0) {
                console.log('📦 No wish cards found, seeding...');
                await seedWishCards();
            }

            break; // Success
        } catch (error) {
            retries -= 1;
            console.error(`❌ Database connection failed. Host: ${sequelize.options.host}`);
            console.error(`❌ Error Type: ${error.name}`);
            console.error(`❌ Error Message: ${error.message}`);
            if (error.original) {
                console.error(`❌ Original Error:`, error.original.message || error.original);
            }
            if (error.parent) {
                console.error(`❌ Parent Error:`, error.parent.message || error.parent);
            }

            if (retries === 0) {
                console.error('❌ Max retries reached. Database features will be unavailable.');
            } else {
                // Try simple host fallback if internal domain fails
                if (currentHost.includes('railway.internal')) {
                    console.log('💡 Trying host fallback to "postgres"...');
                    currentHost = 'postgres';
                    sequelize.options.host = 'postgres';
                }
                console.log(`📡 Retrying in 5s...`);
            }
            await new Promise(res => setTimeout(res, 5000));
        }
    }

    // 2. Connect to Redis (optional)
    try {
        if (redis) {
            // Check if already connected or if we need to call connect
            // ioredis usually connects automatically unless lazyConnect: true
            console.log('📡 Connecting to Redis...');
        }
    } catch (error) {
        console.error('❌ Redis initialization failed:', error.message);
    }

    // 3. Initialize Bot
    try {
        // Set webhook in production
        if (config.nodeEnv === 'production' && config.apiUrl) {
            const webhookUrl = `${config.apiUrl.replace(/\/$/, '')}/webhook`;
            await bot.telegram.setWebhook(webhookUrl);
            console.log(`✅ Telegram webhook set: ${webhookUrl}`);
        } else {
            bot.launch();
            console.log('✅ Telegram bot started (polling)');
        }
    } catch (error) {
        console.error('❌ Bot initialization failed:', error.message);
    }

    // 4. Start reminder job
    try {
        const { startReminderJob } = require('./jobs/reminderJob');
        startReminderJob();
        console.log('✅ Reminder job started');
    } catch (error) {
        console.error('❌ Reminder job failed to start:', error.message);
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
