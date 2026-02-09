module.exports = (sequelize, DataTypes) => {
  const Copy = sequelize.define("Copy", {
    copy_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    copy_code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    book_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: "available"
    }
  });

  return Copy;
};
