// db/User.js
const { DataTypes } = require('sequelize');
const sequelize = require('./connection');
const ApiKey = require('./ApiKey');

const User = sequelize.define("User", {
  firstname: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastname: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },

  // FK API KEY (WAJIB ADA)
  apiKeyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: ApiKey,
      key: "id"
    }
  }
});

// RELASI
ApiKey.hasMany(User, { foreignKey: "apiKeyId" });
User.belongsTo(ApiKey, { foreignKey: "apiKeyId" });

module.exports = User;
