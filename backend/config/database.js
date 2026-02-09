const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  "library_db",   // database name
  "root",         // username
  "",     // password
  {
    host: "localhost",
    dialect: "mysql"
  }
);

module.exports = sequelize;
