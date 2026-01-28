require('dotenv').config();

module.exports = {
    // Server
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',

    // Database
    databaseUrl: process.env.DATABASE_URL,

    // Redis
    redisUrl: process.env.REDIS_URL,

    // Telegram
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    webappUrl: process.env.WEBAPP_URL,
    apiUrl: process.env.API_URL || process.env.RAILWAY_PUBLIC_DOMAIN,
    botUsername: process.env.BOT_USERNAME || 'pulse_relationship_bot',

    // Security
    jwtSecret: process.env.JWT_SECRET || 'default-secret',

    // Feature flags
    enableRedis: process.env.ENABLE_REDIS !== 'false',
};
