const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        allowNull: false,
    },
    telegramId: {
        type: DataTypes.BIGINT,
        allowNull: true,
    },
    chatId: {
        type: DataTypes.BIGINT,
        allowNull: true,
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
    premiumUntil: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    country: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    discount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    appliedPromoCode: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
}, {
    tableName: 'users',
    indexes: [
        { fields: ['username'] },
        { fields: ['telegram_id'] },
        { fields: ['chat_id'] },
    ],
});

module.exports = User;

