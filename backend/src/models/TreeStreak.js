const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TreeStreak = sequelize.define('TreeStreak', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    pairId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: { model: 'pairs', key: 'id' },
    },
    currentStreak: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Current consecutive days of interaction',
    },
    maxStreak: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Highest streak ever achieved',
    },
    treeLevel: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        validate: { min: 1, max: 5 },
        comment: '1=Sprout, 2=Seedling, 3=Young, 4=Mature, 5=Blooming',
    },
    lastInteractionDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    totalInteractions: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
}, {
    tableName: 'tree_streaks',
    indexes: [
        { fields: ['pair_id'], unique: true },
    ],
});

// Tree level thresholds
TreeStreak.LEVELS = {
    1: { name: 'sprout', minDays: 0 },
    2: { name: 'seedling', minDays: 7 },
    3: { name: 'young', minDays: 21 },
    4: { name: 'mature', minDays: 50 },
    5: { name: 'blooming', minDays: 100 },
};

// Calculate tree level based on streak
TreeStreak.calculateLevel = (streak) => {
    if (streak >= 100) return 5;
    if (streak >= 50) return 4;
    if (streak >= 21) return 3;
    if (streak >= 7) return 2;
    return 1;
};

module.exports = TreeStreak;
