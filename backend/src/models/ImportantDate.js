const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ImportantDate = sequelize.define('ImportantDate', {
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
    createdBy: {
        type: DataTypes.BIGINT,
        allowNull: true, // Allow null for existing rows
    },
    title: {
        type: DataTypes.STRING(200),
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    eventDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    category: {
        type: DataTypes.ENUM('anniversary', 'birthday', 'first_date', 'custom'),
        defaultValue: 'custom',
    },
    visibility: {
        type: DataTypes.STRING(20),
        defaultValue: 'both',
    },
    reminderDays: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
    },
    isRecurring: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    lastReminderSent: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'important_dates',
    indexes: [
        { fields: ['pair_id'] },
        { fields: ['event_date'] },
    ],
});

module.exports = ImportantDate;


