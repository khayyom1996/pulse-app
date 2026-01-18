const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('Payment', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'users', key: 'id' },
    },
    amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    currency: {
        type: DataTypes.STRING(10),
        defaultValue: 'XTR', // Telegram Stars
    },
    status: {
        type: DataTypes.ENUM('pending', 'completed', 'failed'),
        defaultValue: 'pending',
    },
    payload: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    tier: {
        type: DataTypes.STRING(20),
        allowNull: true,
    },
    telegramPaymentChargeId: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    tableName: 'payments',
    indexes: [
        { fields: ['user_id'] },
        { fields: ['payload'] },
    ],
});

module.exports = Payment;
