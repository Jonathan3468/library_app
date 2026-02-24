//notificationService.js

const nodemailer = require('nodemailer');

// Configure Gmail transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Test connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Email error:', error.message);
    console.log('⚠️  Check your .env file - EMAIL_USER and EMAIL_PASS must be correct');
  } else {
    console.log('✅ Gmail is ready to send emails');
  }
});

// ======================================================
// SEND OVERDUE EMAIL
// ======================================================
const sendOverdueEmail = async (borrower, issue, book) => {
  if (!borrower.email) {
    console.log(`No email found for borrower ${borrower.borrower_id}`);
    return false;
  }

  const daysOverdue = Math.ceil(
    (new Date() - new Date(issue.due_date)) / (1000 * 60 * 60 * 24)
  );

  const mailOptions = {
    from: `"SmartLib System" <${process.env.EMAIL_USER}>`,
    to: borrower.email,
    subject: `⚠️ Overdue Book Reminder - ${book.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Overdue Book Notice</h2>
        <p>Dear ${borrower.borrower_name},</p>
        <p>This is a friendly reminder that the following book is now <strong>${daysOverdue} day(s) overdue</strong>:</p>
        <div style="background-color: #fee2e2; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Book:</strong> ${book.title}</p>
          <p><strong>ISBN:</strong> ${book.isbn}</p>
          <p><strong>Due Date:</strong> ${new Date(issue.due_date).toLocaleDateString()}</p>
          <p><strong>Days Overdue:</strong> ${daysOverdue}</p>
          ${issue.fine > 0 ? `<p><strong>Fine:</strong> ₹${issue.fine.toFixed(2)}</p>` : ''}
        </div>
        <p>Please return this book as soon as possible to avoid additional fines.</p>
        <p>Thank you,<br>Library Management</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ REAL email sent to ${borrower.email} from ${process.env.EMAIL_USER}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    return false;
  }
};

// ======================================================
// SEND REMINDER EMAIL
// ======================================================
const sendReminderEmail = async (borrower, issue, book) => {
  if (!borrower.email) return false;

  const daysUntilDue = Math.ceil(
    (new Date(issue.due_date) - new Date()) / (1000 * 60 * 60 * 24)
  );

  const mailOptions = {
    from: `"SmartLib System" <${process.env.EMAIL_USER}>`,
    to: borrower.email,
    subject: `📚 Reminder: Book Due Soon - ${book.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Book Due Date Reminder</h2>
        <p>Dear ${borrower.borrower_name},</p>
        <p>This is a friendly reminder that the following book is due in <strong>${daysUntilDue} day(s)</strong>:</p>
        <div style="background-color: #eff6ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Book:</strong> ${book.title}</p>
          <p><strong>ISBN:</strong> ${book.isbn}</p>
          <p><strong>Due Date:</strong> ${new Date(issue.due_date).toLocaleDateString()}</p>
        </div>
        <p>Please return or renew this book before the due date to avoid late fees.</p>
        <p>Thank you,<br>Library Management</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ REAL email sent to ${borrower.email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending reminder:', error.message);
    return false;
  }
};

// ======================================================
// SEND OVERDUE SMS (Placeholder)
// ======================================================
const sendOverdueSMS = async (borrower, issue, book) => {
  if (!borrower.phone) {
    console.log(`No phone found for borrower ${borrower.borrower_id}`);
    return false;
  }
  console.log(`Would send SMS to ${borrower.phone} about overdue book`);
  return false;
};

// ======================================================
// SEND FINE CREATED EMAIL
// ======================================================
const sendFineCreatedEmail = async (borrower, fineDetails) => {
  if (!borrower.email) {
    console.log(`No email found for borrower ${borrower.borrower_id}`);
    return false;
  }

  const {
    amount, reason, type, issue_id, payment_id,
    book_title, due_date, check_in
  } = fineDetails;

  const fineId = issue_id || payment_id;
  const isCustomFine = type === 'custom_fine';

  const mailOptions = {
    from: `"SmartLib System" <${process.env.EMAIL_USER}>`,
    to: borrower.email,
    subject: `💰 Fine Notice - ₹${amount}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
        <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #dc2626; margin: 0;">Fine Notice</h1>
            <p style="color: #6b7280; margin-top: 5px;">SmartLib Library Management System</p>
          </div>
          <div style="border-top: 3px solid #dc2626; padding-top: 20px;">
            <p>Dear ${borrower.borrower_name},</p>
            <p>A fine has been issued to your account. Please review the details below:</p>
            <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #6b7280; width: 40%;">Fine ID:</td><td style="padding: 8px 0; font-weight: bold;">${fineId}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Amount:</td><td style="padding: 8px 0; font-size: 24px; color: #dc2626; font-weight: bold;">₹${parseFloat(amount).toFixed(2)}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Type:</td><td style="padding: 8px 0; font-weight: bold;">${isCustomFine ? 'Custom Fine' : 'Late Return Fine'}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Reason:</td><td style="padding: 8px 0;">${reason || 'Late return'}</td></tr>
                ${book_title ? `<tr><td style="padding: 8px 0; color: #6b7280;">Book:</td><td style="padding: 8px 0;">${book_title}</td></tr>` : ''}
                ${due_date ? `<tr><td style="padding: 8px 0; color: #6b7280;">Due Date:</td><td style="padding: 8px 0;">${new Date(due_date).toLocaleDateString()}</td></tr>` : ''}
                ${check_in ? `<tr><td style="padding: 8px 0; color: #6b7280;">Returned On:</td><td style="padding: 8px 0;">${new Date(check_in).toLocaleDateString()}</td></tr>` : ''}
                <tr><td style="padding: 8px 0; color: #6b7280;">Date Issued:</td><td style="padding: 8px 0;">${new Date().toLocaleDateString()}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Status:</td><td style="padding: 8px 0;"><span style="background-color: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">PENDING</span></td></tr>
              </table>
            </div>
            <p>Please settle this fine at the library circulation desk at your earliest convenience.</p>
            <p style="margin-top: 20px;">Thank you,<br><strong>SmartLib Management</strong></p>
          </div>
          <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
            <p>This is an automated message from SmartLib Library Management System</p>
            <p>Borrower ID: ${borrower.borrower_id} ${borrower.rf_id ? `| RF ID: ${borrower.rf_id}` : ''}</p>
          </div>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Fine created email sent to ${borrower.email} for ₹${amount}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending fine created email:', error.message);
    return false;
  }
};

// ======================================================
// SEND FINE PAID EMAIL (PAYMENT RECEIPT)
// ======================================================
const sendFinePaidEmail = async (borrower, fineDetails) => {
  if (!borrower.email) {
    console.log(`No email found for borrower ${borrower.borrower_id}`);
    return false;
  }

  const {
    amount, reason, type, issue_id, payment_id,
    payment_method, payment_date, book_title, due_date, check_in
  } = fineDetails;

  const fineId = issue_id || payment_id;
  const isCustomFine = type === 'custom_fine';
  const paymentMethodEmoji = { cash: '💵', card: '💳', upi: '📱', online: '🌐' };

  const mailOptions = {
    from: `"SmartLib System" <${process.env.EMAIL_USER}>`,
    to: borrower.email,
    subject: `✅ Payment Receipt - ₹${amount} Paid`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
        <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background-color: #dcfce7; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 40px;">✅</span>
            </div>
            <h1 style="color: #16a34a; margin: 0;">Payment Received</h1>
            <p style="color: #6b7280; margin-top: 5px;">Thank you for your payment</p>
          </div>
          <div style="border-top: 3px solid #16a34a; padding-top: 20px;">
            <p>Dear ${borrower.borrower_name},</p>
            <p>This email confirms that we have received your payment for the fine listed below.</p>
            <div style="background-color: #dcfce7; border-left: 4px solid #16a34a; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #6b7280; width: 40%;">Receipt ID:</td><td style="padding: 8px 0; font-weight: bold;">${fineId}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Amount Paid:</td><td style="padding: 8px 0; font-size: 24px; color: #16a34a; font-weight: bold;">₹${parseFloat(amount).toFixed(2)}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Payment Method:</td><td style="padding: 8px 0; font-weight: bold;">${paymentMethodEmoji[payment_method] || ''} ${payment_method ? payment_method.charAt(0).toUpperCase() + payment_method.slice(1) : 'N/A'}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Payment Date:</td><td style="padding: 8px 0;">${new Date(payment_date || Date.now()).toLocaleDateString()} ${new Date(payment_date || Date.now()).toLocaleTimeString()}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Fine Type:</td><td style="padding: 8px 0;">${isCustomFine ? 'Custom Fine' : 'Late Return Fine'}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Reason:</td><td style="padding: 8px 0;">${reason || 'Late return'}</td></tr>
                ${book_title ? `<tr><td style="padding: 8px 0; color: #6b7280;">Book:</td><td style="padding: 8px 0;">${book_title}</td></tr>` : ''}
                ${due_date ? `<tr><td style="padding: 8px 0; color: #6b7280;">Due Date:</td><td style="padding: 8px 0;">${new Date(due_date).toLocaleDateString()}</td></tr>` : ''}
                ${check_in ? `<tr><td style="padding: 8px 0; color: #6b7280;">Returned On:</td><td style="padding: 8px 0;">${new Date(check_in).toLocaleDateString()}</td></tr>` : ''}
                <tr><td style="padding: 8px 0; color: #6b7280;">Status:</td><td style="padding: 8px 0;"><span style="background-color: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">PAID</span></td></tr>
              </table>
            </div>
            <p>Your account is now clear. Thank you for promptly settling this fine.</p>
            <p style="margin-top: 20px;">Best regards,<br><strong>SmartLib Management</strong></p>
          </div>
          <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
            <p>This is an automated receipt from SmartLib Library Management System</p>
            <p>Borrower ID: ${borrower.borrower_id} ${borrower.rf_id ? `| RF ID: ${borrower.rf_id}` : ''}</p>
          </div>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Payment receipt email sent to ${borrower.email} for ₹${amount}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending payment receipt email:', error.message);
    return false;
  }
};

// ======================================================
// SEND FINE WAIVED EMAIL
// ======================================================
const sendFineWaivedEmail = async (borrower, fineDetails) => {
  if (!borrower.email) {
    console.log(`No email found for borrower ${borrower.borrower_id}`);
    return false;
  }

  const { amount, reason, type, issue_id, payment_id, book_title } = fineDetails;
  const fineId = issue_id || payment_id;

  const mailOptions = {
    from: `"SmartLib System" <${process.env.EMAIL_USER}>`,
    to: borrower.email,
    subject: `📢 Fine Waived - ₹${amount}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
        <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #d97706; margin: 0;">Fine Waived</h1>
            <p style="color: #6b7280; margin-top: 5px;">Good news from the library</p>
          </div>
          <div style="border-top: 3px solid #d97706; padding-top: 20px;">
            <p>Dear ${borrower.borrower_name},</p>
            <p>We are pleased to inform you that a fine has been <strong>waived</strong> from your account.</p>
            <div style="background-color: #fef3c7; border-left: 4px solid #d97706; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #6b7280; width: 40%;">Fine ID:</td><td style="padding: 8px 0; font-weight: bold;">${fineId}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Amount Waived:</td><td style="padding: 8px 0; font-size: 24px; color: #d97706; font-weight: bold;">₹${parseFloat(amount).toFixed(2)}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Reason:</td><td style="padding: 8px 0;">${reason || 'N/A'}</td></tr>
                ${book_title ? `<tr><td style="padding: 8px 0; color: #6b7280;">Book:</td><td style="padding: 8px 0;">${book_title}</td></tr>` : ''}
                <tr><td style="padding: 8px 0; color: #6b7280;">Waived Date:</td><td style="padding: 8px 0;">${new Date().toLocaleDateString()}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Status:</td><td style="padding: 8px 0;"><span style="background-color: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">WAIVED</span></td></tr>
              </table>
            </div>
            <p>No payment is required. This fine has been forgiven.</p>
            <p style="margin-top: 20px;">Thank you,<br><strong>SmartLib Management</strong></p>
          </div>
          <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
            <p>This is an automated message from SmartLib Library Management System</p>
          </div>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Waive email sent to ${borrower.email} for ₹${amount}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending waive email:', error.message);
    return false;
  }
};


// ======================================================
// SEND PASSWORD RESET EMAIL
// ======================================================
// ======================================================
// SEND PASSWORD RESET EMAIL
// ======================================================
const sendPasswordResetEmail = async (user, resetLink, otp = null) => {
  if (!user.email) return false;

  const mailOptions = {
    from: `"SmartLib System" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `🔐 Password Reset Request - SmartLib`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
        <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">Password Reset</h1>
            <p style="color: #6b7280; margin-top: 5px;">SmartLib Library Management System</p>
          </div>
          <div style="border-top: 3px solid #2563eb; padding-top: 20px;">
            <p>Dear ${user.name},</p>
            <p>We received a request to reset your password.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">Reset Password (Web)</a>
            </div>

            ${otp ? `
            <div style="background-color: #eff6ff; border: 2px dashed #2563eb; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
              <p style="margin: 0 0 8px 0; color: #1e40af; font-weight: bold;">📱 Using the Mobile App?</p>
              <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 13px;">Enter this code in the app:</p>
              <div style="font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #1d4ed8; font-family: monospace;">${otp}</div>
              <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 12px;">This code expires in 1 hour</p>
            </div>
            ` : ''}

            <div style="background-color: #fef3c7; border-left: 4px solid #d97706; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e;"><strong>⏳ This link/code expires in 1 hour.</strong></p>
              <p style="margin: 8px 0 0 0; color: #92400e;">If you did not request a password reset, you can safely ignore this email.</p>
            </div>

            <p style="color: #6b7280; font-size: 12px;">If the button doesn't work, copy and paste this link:<br>
              <a href="${resetLink}" style="color: #2563eb;">${resetLink}</a>
            </p>
            <p style="margin-top: 20px;">Thank you,<br><strong>SmartLib Management</strong></p>
          </div>
          <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
            <p>This is an automated message from SmartLib Library Management System</p>
          </div>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${user.email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending password reset email:', error.message);
    return false;
  }
};
// ======================================================
// SEND REQUEST AVAILABLE EMAIL
// Notify borrower that the book they requested is now
// available and will be held for 2 days.
// ======================================================




const sendRequestAvailableEmail = async (borrower, requestDetails) => {
  if (!borrower.email) {
    console.log(`No email found for borrower ${borrower.borrower_id}`);
    return false;
  }

  const { book_title, copy_code, request_id } = requestDetails;

  const today = new Date();
  const holdUntil = new Date();
  holdUntil.setDate(today.getDate() + 2);
  const holdUntilFormatted = holdUntil.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const mailOptions = {
    from: `"SmartLib System" <${process.env.EMAIL_USER}>`,
    to: borrower.email,
    subject: `📗 Your Requested Book is Now Available — ${book_title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
        <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background-color: #dcfce7; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 40px;">📗</span>
            </div>
            <h1 style="color: #16a34a; margin: 0;">Book Available for Pickup</h1>
            <p style="color: #6b7280; margin-top: 5px;">SmartLib Library Management System</p>
          </div>

          <div style="border-top: 3px solid #16a34a; padding-top: 20px;">
            <p>Dear ${borrower.borrower_name},</p>

            <p>
              We are pleased to inform you that a copy of the book you requested is now available
              at the library circulation desk.
            </p>

            <div style="background-color: #dcfce7; border-left: 4px solid #16a34a; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; width: 40%;">Request ID:</td>
                  <td style="padding: 8px 0; font-weight: bold;">#${request_id}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Book Title:</td>
                  <td style="padding: 8px 0; font-weight: bold; font-size: 16px;">${book_title}</td>
                </tr>
                ${copy_code ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Copy Code:</td>
                  <td style="padding: 8px 0; font-family: monospace; background-color: #f0fdf4; padding: 4px 8px; border-radius: 4px;">${copy_code}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Available From:</td>
                  <td style="padding: 8px 0;">${today.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Hold Expires:</td>
                  <td style="padding: 8px 0; font-weight: bold; color: #dc2626;">${holdUntilFormatted}</td>
                </tr>
              </table>
            </div>

            <div style="background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #d97706;">
              <p style="margin: 0; color: #92400e; font-weight: bold;">⏳ Important — 2-Day Hold Policy</p>
              <p style="margin: 8px 0 0 0; color: #92400e;">
                This copy has been set aside for you and will be held at the circulation desk until
                <strong>${holdUntilFormatted}</strong>. If it is not collected by this date, the hold
                will be released and the copy will become available to other members.
              </p>
            </div>

            <p>
              To collect your book, please visit the library circulation desk and present your
              library card or RF ID. Our staff will be happy to assist you.
            </p>

            <p>
              If you are unable to collect the book within this period or no longer require it,
              please notify the library staff so we may release the hold for other members.
            </p>

            <p style="margin-top: 30px;">
              We look forward to seeing you soon.<br><br>
              Warm regards,<br>
              <strong>SmartLib Library Management</strong>
            </p>
          </div>

          <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
            <p>This is an automated notification from SmartLib Library Management System</p>
            <p>Borrower ID: ${borrower.borrower_id} ${borrower.rf_id ? `| RF ID: ${borrower.rf_id}` : ''}</p>
          </div>

        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Request available email sent to ${borrower.email} for "${book_title}"`);
    return true;
  } catch (error) {
    console.error('❌ Error sending request available email:', error.message);
    return false;
  }
};

const notifyFineCreated = sendFineCreatedEmail;
const notifyFinePaid = sendFinePaidEmail;





// ======================================================
// SEND REQUEST CANCELLED EMAIL
// ======================================================
const sendRequestCancelledEmail = async (borrower, requestDetails) => {
  if (!borrower.email) {
    console.log(`No email found for borrower ${borrower.borrower_id}`);
    return false;
  }

  const { book_title, copy_code, request_id, cancelled_by } = requestDetails;

  const mailOptions = {
    from: `"SmartLib System" <${process.env.EMAIL_USER}>`,
    to: borrower.email,
    subject: `❌ Book Request Cancelled — ${book_title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
        <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background-color: #fee2e2; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 40px;">❌</span>
            </div>
            <h1 style="color: #dc2626; margin: 0;">Request Cancelled</h1>
            <p style="color: #6b7280; margin-top: 5px;">SmartLib Library Management System</p>
          </div>

          <div style="border-top: 3px solid #dc2626; padding-top: 20px;">
            <p>Dear ${borrower.borrower_name},</p>
            <p>
              Your book request has been <strong>cancelled</strong>.
              ${cancelled_by === 'staff' ? ' A library staff member has cancelled this request on your behalf.' : ''}
            </p>

            <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; width: 40%;">Request ID:</td>
                  <td style="padding: 8px 0; font-weight: bold;">#${request_id}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Book Title:</td>
                  <td style="padding: 8px 0; font-weight: bold; font-size: 16px;">${book_title}</td>
                </tr>
                ${copy_code ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Copy Code:</td>
                  <td style="padding: 8px 0; font-family: monospace;">${copy_code}</td>
                </tr>` : ''}
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Cancelled On:</td>
                  <td style="padding: 8px 0;">${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Status:</td>
                  <td style="padding: 8px 0;">
                    <span style="background-color: #fee2e2; color: #991b1b; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">CANCELLED</span>
                  </td>
                </tr>
              </table>
            </div>

            <p>
              If you still wish to borrow this book, you are welcome to place a new request
              or visit the library circulation desk and our staff will be happy to assist you.
            </p>

            <p style="margin-top: 30px;">
              Thank you,<br>
              <strong>SmartLib Library Management</strong>
            </p>
          </div>

          <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
            <p>This is an automated message from SmartLib Library Management System</p>
            <p>Borrower ID: ${borrower.borrower_id} ${borrower.rf_id ? `| RF ID: ${borrower.rf_id}` : ''}</p>
          </div>

        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Cancellation email sent to ${borrower.email} for "${book_title}"`);
    return true;
  } catch (error) {
    console.error('❌ Error sending cancellation email:', error.message);
    return false;
  }
};


module.exports = {
  sendOverdueEmail,
  sendOverdueSMS,
  sendReminderEmail,
  sendFineWaivedEmail,
  sendRequestAvailableEmail,
  sendRequestCancelledEmail,
  notifyFineCreated,
  notifyFinePaid,
  sendPasswordResetEmail  
};