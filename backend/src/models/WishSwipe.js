const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WishSwipe = sequelize.define('WishSwipe', {
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
    liked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
    },
}, {
    tableName: 'wish_swipes',
    indexes: [
        { fields: ['user_id', 'card_id'], unique: true },
        { fields: ['pair_id'] },
    ],
});

module.exports = WishSwipe;
