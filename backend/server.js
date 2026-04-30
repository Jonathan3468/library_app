require("dotenv").config();

const express = require("express");
const cors = require("cors"); 
const { sequelize } = require("./models");

const settingsRoutes = require("./routes/settings.routes");

const noticeRoutes = require("./routes/notice.routes");

const app = express();

app.use(cors({
  origin: "*"
}));
app.use(express.json());
// Import routes
const authRoutes = require("./routes/auth.routes");
const scanRoutes = require("./routes/scan.routes");
const searchRoutes = require("./routes/search.routes");
const genreRoutes = require("./routes/genre.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const reportsRoutes = require("./routes/reports.routes");
const authorRoutes = require("./routes/author.routes");
const bookRoutes = require("./routes/book.routes");
const borrowerRoutes = require("./routes/borrower.routes");
const copyRoutes = require("./routes/copy.routes");
const requestRoutes = require("./routes/request.routes");
const issueRoutes = require("./routes/issue.routes");
const publicationRoutes = require("./routes/publication.routes");
const categoryRoutes = require("./routes/category.routes");
const notificationRoutes = require("./routes/notification.routes");
const fineRoutes = require("./routes/fine.routes"); // NEW
const auditRoutes = require("./routes/audit.routes");
  
// Use routes
app.use("/notices", noticeRoutes);
app.use("/publications", publicationRoutes);
app.use("/categories", categoryRoutes);
app.use("/genres", genreRoutes);
app.use("/auth", authRoutes);
app.use("/authors", authorRoutes);
app.use("/books", bookRoutes);
app.use("/scan", scanRoutes);
app.use("/borrowers", borrowerRoutes);
app.use("/copies", copyRoutes);
app.use("/requests", requestRoutes);
app.use("/issues", issueRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/reports", reportsRoutes);
app.use("/search", searchRoutes);
app.use("/notifications", notificationRoutes);
app.use("/fines", fineRoutes); // NEW
app.use("/api/settings", settingsRoutes);
app.use("/renewal-requests", require("./routes/renewal-requests.routes"));
app.use("/audit-logs", auditRoutes);
// Import notification scheduler
const { startNotificationScheduler } = require('./jobs/notificationScheduler');

// Sync DB
 sequelize.authenticate();
  // adds the new table without touching existing ones
console.log('✅ Database connected');

const PORT = 3000;
app.listen(PORT, () => { 
  
  console.log(`Server running on port ${PORT}`);
  startNotificationScheduler();

});