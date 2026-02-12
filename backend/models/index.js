const sequelize = require("../config/database");
const { DataTypes } = require("sequelize");

// ================= IMPORT MODELS =================

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

// ================= RELATIONSHIPS =================

// 🔹 Author ↔ Book (Many-to-Many)
Author.belongsToMany(Book, { 
  through: AuthorBook, 
  foreignKey: "author_id" 
});
Book.belongsToMany(Author, { 
  through: AuthorBook, 
  foreignKey: "book_id" 
});

// 🔹 Book ↔ Genre (Many-to-Many)
Book.belongsToMany(Genre, { 
  through: BookGenre, 
  foreignKey: "book_id" 
});
Genre.belongsToMany(Book, { 
  through: BookGenre, 
  foreignKey: "genre_id" 
});

// 🔹 Publication → Book (1-to-Many)
Publication.hasMany(Book, { 
  foreignKey: "publication_id" 
});
Book.belongsTo(Publication, { 
  foreignKey: "publication_id" 
});

// 🔹 Category → Book (1-to-Many)
Category.hasMany(Book, { 
  foreignKey: "category_id" 
});
Book.belongsTo(Category, { 
  foreignKey: "category_id" 
});

// 🔹 Book → Copy (1-to-Many)
Book.hasMany(Copy, { 
  foreignKey: "book_id" 
});
Copy.belongsTo(Book, { 
  foreignKey: "book_id" 
});

// 🔹 Borrower ↔ Copy (Request Many-to-Many)
Borrower.belongsToMany(Copy, { 
  through: Request, 
  foreignKey: "borrower_id" 
});
Copy.belongsToMany(Borrower, { 
  through: Request, 
  foreignKey: "copy_id" 
});

// 🔹 Borrower ↔ Copy (Issue Many-to-Many)
Borrower.belongsToMany(Copy, { 
  through: Issue, 
  foreignKey: "borrower_id" 
});
Copy.belongsToMany(Borrower, { 
  through: Issue, 
  foreignKey: "copy_id" 
});

// 🔥 IMPORTANT: Direct Issue Relationships (For Reports & Includes)
Issue.belongsTo(Borrower, { 
  foreignKey: "borrower_id" 
});
Issue.belongsTo(Copy, { 
  foreignKey: "copy_id" 
});

Borrower.hasMany(Issue, { 
  foreignKey: "borrower_id" 
});
Copy.hasMany(Issue, { 
  foreignKey: "copy_id" 
});

// ================= EXPORT =================

module.exports = {
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
  Issue
};
