module.exports = (sequelize, DataTypes) => {
  return sequelize.define("Borrower", {
    borrower_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    borrower_name: { type: DataTypes.STRING, allowNull: false },
    membership_expiry: { type: DataTypes.DATE, allowNull: true } // <-- new membership date
  });
};
