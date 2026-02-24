module.exports = (sequelize, DataTypes) => {
  return sequelize.define("Borrower", {
    borrower_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // nullable for legacy borrowers
      unique: true, // one user = one borrower
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    borrower_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    rf_id: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    membership_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    membership_expiry: {
      type: DataTypes.DATE,
      allowNull: true
    }
  });
};