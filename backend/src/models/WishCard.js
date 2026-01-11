const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WishCard = sequelize.define('WishCard', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    category: {
        type: DataTypes.ENUM('romance', 'adventure', 'leisure'),
        allowNull: false,
    },
    textRu: {
        type: DataTypes.STRING(300),
        allowNull: false,
    },
    textEn: {
        type: DataTypes.STRING(300),
        allowNull: true,
    },
    textTg: {
        type: DataTypes.STRING(300),
        allowNull: true,
    },
    emoji: {
        type: DataTypes.STRING(10),
        allowNull: true,
    },
    isPremium: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    sortOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
}, {
    tableName: 'wish_cards',
    indexes: [
        { fields: ['category'] },
        { fields: ['is_premium'] },
    ],
});

module.exports = WishCard;
