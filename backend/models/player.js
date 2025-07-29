'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Player extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
    }
  }
  Player.init({
    name: DataTypes.STRING,
    namalengkap: DataTypes.STRING,
    notlp: DataTypes.STRING,
    ig: DataTypes.STRING,
    avatar: DataTypes.STRING,
    score: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    sequelize,
    modelName: 'Player',
  });
  return Player;
};