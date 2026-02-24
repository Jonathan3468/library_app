module.exports = (sequelize, DataTypes) => {
  const RenewalRequest = sequelize.define("RenewalRequest", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    issue_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    borrower_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    copy_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("pending", "approved", "denied"),
      defaultValue: "pending",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  });

  return RenewalRequest;
};