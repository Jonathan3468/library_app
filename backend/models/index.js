const sequelize = require("../config/database");
const { DataTypes } = require("sequelize");

// ================= IMPORT MODELS =================
 const AuditLog = require("./AuditLog")(sequelize, DataTypes);
const FinePayment = require("./FinePayment")(sequelize, DataTypes);
const Author = require("./Author")(sequelize, DataTypes);
const Book = require("./Book")(sequelize, DataTypes);
const Genre = require("./Genre")(sequelize, DataTypes);
const Publication = require("./Publication")(sequelize, DataTypes);
const Category = require("./Category")(sequelize, DataTypes);
const Borrower = require("./Borrower")(sequelize, DataTypes);
const Copy = require("./Copy")(sequelize, DataTypes);
const AuthorBook = require("./AuthorBook")(sequelize, DataTypes);
const BookGenre = require("./BookGenre")(sequelize, DataTypes);
const Request = require("./Request")(sequelize, DataTypes);
const Issue = require("./Issue")(sequelize, DataTypes);
const User = require("./user")(sequelize, DataTypes);
const Notice = require("./Notice")(sequelize, DataTypes);
const RenewalRequest = require("./Renewalrequest")(sequelize, DataTypes);
// ================= RELATIONSHIPS =================

// 🔹 Author ↔ Book (Many-to-Many)
Author.belongsToMany(Book, {
  through: AuthorBook,
  foreignKey: "author_id",
});
Book.belongsToMany(Author, {
  through: AuthorBook,
  foreignKey: "book_id",
});

// 🔹 Book ↔ Genre (Many-to-Many)
Book.belongsToMany(Genre, {
  through: BookGenre,
  foreignKey: "book_id",
});
Genre.belongsToMany(Book, {
  through: BookGenre,
  foreignKey: "genre_id",
});

// 🔹 Publication → Book (1-to-Many)
Publication.hasMany(Book, {
  foreignKey: "publication_id",
});
Book.belongsTo(Publication, {
  foreignKey: "publication_id",
});

// 🔹 Category → Book (1-to-Many)
Category.hasMany(Book, {
  foreignKey: "category_id",
});
Book.belongsTo(Category, {
  foreignKey: "category_id",
});

// 🔹 Book → Copy (1-to-Many)
Book.hasMany(Copy, {
  foreignKey: "book_id",
});
Copy.belongsTo(Book, {
  foreignKey: "book_id",
});

// 🔹 REQUEST RELATIONSHIPS
Request.belongsTo(Borrower, {
  foreignKey: "borrower_id",
});
Borrower.hasMany(Request, {
  foreignKey: "borrower_id",
});

Request.belongsTo(Copy, {
  foreignKey: "copy_id",
});
Copy.hasMany(Request, {
  foreignKey: "copy_id",
});

// 🔹 ISSUE RELATIONSHIPS
Issue.belongsTo(Borrower, {
  foreignKey: "borrower_id",
});
Borrower.hasMany(Issue, {
  foreignKey: "borrower_id",
});

Issue.belongsTo(Copy, {
  foreignKey: "copy_id",
});
Copy.hasMany(Issue, {
  foreignKey: "copy_id",
});

// 🔹 FinePayment relationships
FinePayment.belongsTo(Borrower, { foreignKey: "borrower_id" });
Borrower.hasMany(FinePayment, { foreignKey: "borrower_id" });

FinePayment.belongsTo(Copy, { foreignKey: "copy_id" });
Copy.hasMany(FinePayment, { foreignKey: "copy_id" });

// ================= 🔥 USER ↔ BORROWER RELATIONSHIP =================
User.hasOne(Borrower, {
  foreignKey: 'user_id',
  as: 'borrower',
  onDelete: 'SET NULL'
});

Borrower.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});


RenewalRequest.belongsTo(Issue,    { foreignKey: "issue_id"    });
RenewalRequest.belongsTo(Borrower, { foreignKey: "borrower_id" });
RenewalRequest.belongsTo(Copy,     { foreignKey: "copy_id"     });
Issue.hasMany(RenewalRequest,    { foreignKey: "issue_id"    });
Borrower.hasMany(RenewalRequest, { foreignKey: "borrower_id" });
// ================= EXPORT =================

module.exports = {
  User,
  sequelize,
  Author,
  Book,
  Genre,
  Publication,
  Category,
  Borrower,
  Copy,
  AuthorBook,
  BookGenre,
  Request,
  Issue,
  FinePayment,
  RenewalRequest,
  AuditLog,
  Notice
};
