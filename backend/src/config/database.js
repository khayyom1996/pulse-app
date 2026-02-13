const { Sequelize } = require('sequelize');
const config = require('./index');

const sequelize = new Sequelize(config.databaseUrl, {
    dialect: 'postgres',
    logging: (msg) => console.log(`[Sequelize] ${msg}`),
    dialectOptions: {
        ssl: (config.nodeEnv === 'production' && !config.databaseUrl.includes('railway.internal') && !config.databaseUrl.includes('postgres')) ? {
            require: true,
            rejectUnauthorized: false
        } : false,
        keepAlive: true,
        family: 4,
    },
    pool: {
        max: 20,
        min: 0,
        acquire: 60000,
        idle: 10000,
    },
    define: {
        timestamps: true,
        underscored: true,
    },
    retry: {
        match: [
            /SequelizeConnectionError/,
            /SequelizeConnectionRefusedError/,
            /SequelizeHostNotFoundError/,
            /SequelizeHostNotReachableError/,
            /SequelizeInvalidConnectionError/,
            /SequelizeConnectionTimedOutError/,
            /TimeoutError/
        ],
        max: 5
    }
});

module.exports = sequelize;
