const { DataTypes } = require('sequelize');
const sequelize = require('./connection');

const ApiKey = sequelize.define('ApiKey', {
  name: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },

  key: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },

  // Status apakah API Key sudah kedaluwarsa
  outOfDate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

  // Optional: field virtual untuk cek apakah expired (tanpa disimpan ke DB)
  isExpired: {
    type: DataTypes.VIRTUAL,
    get() {
      const created = new Date(this.createdAt);
      const now = new Date();
      const diffMs = now - created;
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays >= 30;  // >= 30 hari = expired
    },
  }
});

module.exports = ApiKey;
