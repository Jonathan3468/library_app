module.exports = (sequelize, DataTypes) => {
  return sequelize.define("Issue", {
    issue_id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },

    borrower_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    copy_id: {
      type: DataTypes.INTEGER,
      allowNull: false
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
      type: DataTypes.DATE
    },

    fine: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    renew_count: {
  type: DataTypes.INTEGER,
  defaultValue: 0
},
due_date: {
  type: DataTypes.DATE,
  allowNull: false
}
  });
};
