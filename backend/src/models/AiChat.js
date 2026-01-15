const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AiChat = sequelize.define('AiChat', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    pairId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'pairs', key: 'id' },
    },
    userId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'users', key: 'id' },
    },
    role: {
        type: DataTypes.ENUM('user', 'model'),
        allowNull: false,
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
}, {
    tableName: 'ai_chats',
    indexes: [
        { fields: ['pair_id'] },
        { fields: ['created_at'] },
    ],
});

module.exports = AiChat;
