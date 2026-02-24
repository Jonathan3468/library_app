module.exports = (sequelize, DataTypes) => {
  return sequelize.define("Issue", {
    issue_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false
    },
    check_out: {
      type: DataTypes.DATE
    },
    check_in: {
      type: DataTypes.DATE
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    fine: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    fine_paid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    payment_method: {
      type: DataTypes.STRING
    },
    payment_date: {
      type: DataTypes.DATE
    },
    waive_reason: {
      type: DataTypes.TEXT
    },
    waived_date: {
      type: DataTypes.DATE
    },
    renew_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  });
};