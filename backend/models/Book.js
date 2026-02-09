module.exports = (sequelize, DataTypes) => {
  return sequelize.define("Book", {
    book_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING, allowNull: false },
    isbn: { type: DataTypes.STRING },
    publication_year: { type: DataTypes.INTEGER }
  });
};
