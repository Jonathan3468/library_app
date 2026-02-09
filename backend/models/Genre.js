module.exports = (sequelize, DataTypes) => {
  return sequelize.define("Genre", {
    genre_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    genre_name: { type: DataTypes.STRING, allowNull: false }
  });
};
