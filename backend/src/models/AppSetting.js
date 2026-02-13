const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AppSetting = sequelize.define('AppSetting', {
    key: {
        type: DataTypes.STRING(100),
        primaryKey: true,
        allowNull: false,
    },
    value: {
        type: DataTypes.STRING(500),
        allowNull: false,
    },
}, {
    tableName: 'app_settings',
});

module.exports = AppSetting;
