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

    // Security
    jwtSecret: process.env.JWT_SECRET || 'default-secret',

    // Feature flags
    enableRedis: process.env.ENABLE_REDIS !== 'false',
};
