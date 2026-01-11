const Redis = require('ioredis');
const config = require('./index');

let redis = null;

if (config.enableRedis && config.redisUrl) {
    redis = new Redis(config.redisUrl, {
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        lazyConnect: true,
    });

    redis.on('connect', () => {
        console.log('✅ Redis connected');
    });

    redis.on('error', (err) => {
        console.error('❌ Redis error:', err.message);
    });
}

module.exports = redis;
