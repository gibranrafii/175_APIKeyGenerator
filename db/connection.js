// db/connection.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('apikey_db', 'root', 'gibran65', {
  host: 'localhost',
  port: 3309,
  dialect: 'mysql'
});

module.exports = sequelize;
