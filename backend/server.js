const express = require("express");
const { sequelize } = require("./models");

const app = express();
app.use(express.json());

// Import routes
const scanRoutes = require("./routes/scan.routes");





const authorRoutes = require("./routes/author.routes");
const bookRoutes = require("./routes/book.routes");
const borrowerRoutes = require("./routes/borrower.routes");
const copyRoutes = require("./routes/copy.routes");
const requestRoutes = require("./routes/request.routes");
const issueRoutes = require("./routes/issue.routes");

// Use routes
app.use("/authors", authorRoutes);
app.use("/books", bookRoutes);
app.use("/scan", scanRoutes);
app.use("/borrowers", borrowerRoutes);
app.use("/copies", copyRoutes);
app.use("/requests", requestRoutes);
app.use("/issues", issueRoutes);


// Sync DB
sequelize.sync({ alter: true })
  .then(() => console.log("✅ DB synced and server running"))
  .catch(err => console.error(err));

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
