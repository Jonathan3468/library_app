module.exports = (sequelize, DataTypes) => {
  return sequelize.define("BookGenre", {}, { timestamps: false });
};
