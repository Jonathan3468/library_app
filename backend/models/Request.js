module.exports = (sequelize, DataTypes) => {
  return sequelize.define("Request", {
    request_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    request_date: { type: DataTypes.DATE },
    expiry_date: { type: DataTypes.DATE },
    status: { type: DataTypes.STRING }
  });
};
