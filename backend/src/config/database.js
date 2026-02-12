const { Sequelize } = require('sequelize');
const config = require('./index');

const sequelize = new Sequelize(config.databaseUrl, {
    dialect: 'postgres',
    logging: config.nodeEnv === 'development' ? console.log : false,
    dialectOptions: {
        ssl: config.nodeEnv === 'production' ? {
            require: true,
            rejectUnauthorized: false // Railway internal DBs often need this
        } : false,
        keepAlive: true,
    },
    pool: {
        max: 20, // Slightly reduced from 25 for safety
        min: 2,
        acquire: 60000, // Increased to 60s
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
