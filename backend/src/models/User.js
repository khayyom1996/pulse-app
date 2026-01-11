const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        allowNull: false,
        comment: 'Telegram user ID',
    },
    username: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    firstName: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    lastName: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    languageCode: {
        type: DataTypes.STRING(10),
        allowNull: true,
        defaultValue: 'ru',
    },
    avatarUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
    isPremium: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
}, {
    tableName: 'users',
    indexes: [
        { fields: ['username'] },
    ],
});

module.exports = User;
