module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define("User", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM("admin", "librarian", "member"),
      allowNull: false,
      defaultValue: "librarian"
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    reset_token: {
  type: DataTypes.STRING,
  allowNull: true
},
reset_token_expiry: {
  type: DataTypes.DATE,
  allowNull: true
},
  reset_otp: {
  type: DataTypes.STRING(6),
  allowNull: true
}
  });

  return User;
};