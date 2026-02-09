module.exports = (sequelize, DataTypes) => {
  return sequelize.define("Publication", {
    publication_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    publication_name: { type: DataTypes.STRING, allowNull: false }
  });
};
