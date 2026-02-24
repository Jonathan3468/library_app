const cron = require('node-cron');
const { Op } = require('sequelize');
const { Issue, Borrower, Copy, Book } = require('../models');
const { sendOverdueEmail, sendReminderEmail } = require('../services/notificationService');

// Run every day at 9:00 AM - Send overdue notifications
const scheduleOverdueNotifications = () => {
  cron.schedule('0 9 * * *', async () => {
    console.log('🔔 Running daily overdue notifications...');

    try {
      const overdueIssues = await Issue.findAll({
        where: {
          status: "issued",
          due_date: { [Op.lt]: new Date() }
        },
        include: [
          { model: Borrower },
          {
            model: Copy,
            include: [{ model: Book }]
          }
        ]
      });

      let sent = 0;
      for (const issue of overdueIssues) {
        const emailSent = await sendOverdueEmail(
          issue.Borrower,
          issue,
          issue.Copy.Book
        );
        if (emailSent) sent++;
      }

      console.log(`✅ Sent ${sent} overdue notifications`);
    } catch (error) {
      console.error('❌ Error in overdue notification job:', error);
    }
  });
};

// Run every day at 8:00 AM - Remind about books due in 2 days
const scheduleReminderNotifications = () => {
  cron.schedule('0 8 * * *', async () => {
    console.log('🔔 Running daily reminder notifications...');

    try {
      const today = new Date();
      const twoDaysLater = new Date();
      twoDaysLater.setDate(today.getDate() + 2);

      const upcomingIssues = await Issue.findAll({
        where: {
          status: "issued",
          due_date: {
            [Op.between]: [today, twoDaysLater]
          }
        },
        include: [
          { model: Borrower },
          {
            model: Copy,
            include: [{ model: Book }]
          }
        ]
      });

      let sent = 0;
      for (const issue of upcomingIssues) {
        const emailSent = await sendReminderEmail(
          issue.Borrower,
          issue,
          issue.Copy.Book
        );
        if (emailSent) sent++;
      }

      console.log(`✅ Sent ${sent} reminder notifications`);
    } catch (error) {
      console.error('❌ Error in reminder notification job:', error);
    }
  });
};

const startNotificationScheduler = () => {
  scheduleOverdueNotifications();
  scheduleReminderNotifications();
  console.log('✅ Notification scheduler started');
  console.log('   - Overdue notifications: Daily at 9:00 AM');
  console.log('   - Reminder notifications: Daily at 8:00 AM');
};

module.exports = { startNotificationScheduler };