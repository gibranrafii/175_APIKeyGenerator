// db/Admin.js
const { DataTypes } = require('sequelize');
const sequelize = require('./connection');

const Admin = sequelize.define('Admin', {
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true, // Email tidak boleh kembar
    validate: {
        isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  }
});

module.exports = Admin;