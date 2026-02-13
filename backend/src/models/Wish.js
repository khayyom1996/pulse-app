const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Wish = sequelize.define('Wish', {
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
    text: {
        type: DataTypes.STRING(500),
        allowNull: false,
    },
    emoji: {
        type: DataTypes.STRING(10),
        allowNull: true,
        defaultValue: '💫',
    },
    isDone: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    doneAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    doneByUserId: {
        type: DataTypes.BIGINT,
        allowNull: true,
    },
}, {
    tableName: 'wishes',
    indexes: [
        { fields: ['pair_id'] },
        { fields: ['user_id'] },
    ],
});

module.exports = Wish;
