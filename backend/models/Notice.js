module.exports = (sequelize, DataTypes) => {
  const Notice = sequelize.define("Notice", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM("info", "warning", "closed", "event"),
      defaultValue: "info",
    },
    posted_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    posted_by_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  });

  return Notice;
};