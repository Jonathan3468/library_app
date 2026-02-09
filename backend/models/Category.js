module.exports = (sequelize, DataTypes) => {
  return sequelize.define("Category", {
    category_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    category_name: { type: DataTypes.STRING, allowNull: false }
  });
};
