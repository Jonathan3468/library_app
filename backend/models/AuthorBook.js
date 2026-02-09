module.exports = (sequelize, DataTypes) => {
  return sequelize.define("AuthorBook", {}, { timestamps: false });
};
