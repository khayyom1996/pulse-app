const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PromoCode = sequelize.define('PromoCode', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
    },
    type: {
        type: DataTypes.ENUM('discount', 'premium'),
        allowNull: false,
        defaultValue: 'premium',
    },
    value: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Percentage for discount, or Days for premium',
    },
    usageLimit: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
    },
    timesUsed: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    createdBy: {
        type: DataTypes.BIGINT, // Admin ID if applicable
        allowNull: true,
    },
}, {
    tableName: 'promo_codes',
    timestamps: true,
});

module.exports = PromoCode;
