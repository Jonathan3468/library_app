module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define("AuditLog", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    action: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    performed_by: {
      type: DataTypes.INTEGER,
      allowNull: true, // null = system action
    },
    performed_by_name: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "System",
    },
    target_type: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    target_id: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    details: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
  });

  return AuditLog;
};