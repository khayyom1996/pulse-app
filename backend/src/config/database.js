const { Sequelize } = require('sequelize');
const config = require('./index');

const sequelize = new Sequelize(config.databaseUrl, {
    dialect: 'postgres',
    logging: config.nodeEnv === 'development' ? console.log : false,
    pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
    },
    define: {
        timestamps: true,
        underscored: true,
    },
});

module.exports = sequelize;
