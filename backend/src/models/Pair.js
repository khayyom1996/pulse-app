const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const Pair = sequelize.define('Pair', {
    id: {
        type: DataTypes.UUID,
        defaultValue: () => uuidv4(),
        primaryKey: true,
    },
    user1Id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'users', key: 'id' },
    },
    user2Id: {
        type: DataTypes.BIGINT,
        allowNull: true, // null until partner joins
        references: { model: 'users', key: 'id' },
    },
    inviteCode: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    pairedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'pairs',
    indexes: [
        { fields: ['invite_code'], unique: true },
        { fields: ['user1_id'] },
        { fields: ['user2_id'] },
    ],
});

// Generate unique invite code
Pair.generateInviteCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

module.exports = Pair;
