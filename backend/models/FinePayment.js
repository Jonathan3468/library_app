module.exports = (sequelize, DataTypes) => {
  const FinePayment = sequelize.define(
    "FinePayment",
    {
      payment_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      borrower_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "borrowers",
          key: "borrower_id"
        }
      },
      copy_id: { // 🔥 NEW FIELD
        type: DataTypes.INTEGER,
        allowNull: true, // Optional - can be null for non-book fines
        references: {
          model: "copies",
          key: "copy_id"
        }
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      reason: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      payment_method: {
        type: DataTypes.ENUM("cash", "card", "upi", "online"),
        defaultValue: "cash"
      },
      status: {
        type: DataTypes.ENUM("pending", "paid", "waived"),
        defaultValue: "pending"
      },
      payment_date: {
        type: DataTypes.DATE,
        allowNull: true
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true
      }
    },
    {
        tableName: "FinePayments",
        timestamps: true
    }
  );

  return FinePayment;
};