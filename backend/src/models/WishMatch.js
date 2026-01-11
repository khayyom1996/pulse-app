const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WishMatch = sequelize.define('WishMatch', {
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
    cardId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'wish_cards', key: 'id' },
    },
    matchedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    isCompleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'wish_matches',
    indexes: [
        { fields: ['pair_id', 'card_id'], unique: true },
        { fields: ['pair_id'] },
    ],
});

module.exports = WishMatch;
