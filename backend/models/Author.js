module.exports = (sequelize, DataTypes) => {
  return sequelize.define("Author", {
    author_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    author_name: { type: DataTypes.STRING, allowNull: false }
  });
};
