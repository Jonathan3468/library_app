module.exports = (sequelize, DataTypes) => {
  return sequelize.define("Issue", {
    issue_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    check_out: { type: DataTypes.DATE },
    check_in: { type: DataTypes.DATE },
    status: { type: DataTypes.STRING },
    fine: { type: DataTypes.FLOAT }
  });
};
