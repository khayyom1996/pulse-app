const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LoveClick = sequelize.define('LoveClick', {
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
    senderId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'users', key: 'id' },
    },
    receiverId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'users', key: 'id' },
    },
    message: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: 'Optional love message',
    },
}, {
    tableName: 'love_clicks',
    indexes: [
        { fields: ['pair_id'] },
        { fields: ['sender_id'] },
        { fields: ['created_at'] },
    ],
});

module.exports = LoveClick;
