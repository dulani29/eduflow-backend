const nodemailer = require('nodemailer');

// Create email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send email function
const sendEmail = async (to, subject, html, text = null) => {
  try {
    const mailOptions = {
      from: `"EduFlow" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      text: text || html.replace(/<[^>]*>/g, ''), // Plain text fallback
      html: html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error: error.message };
  }
};

// Welcome email template for O/L students
const sendWelcomeEmail = async (to, name, medium) => {
  const subject = 'Welcome to EduFlow - Your O/L Exam Preparation Partner!';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4A90E2;">Welcome to EduFlow, ${name}! 🇱🇰</h2>
      <p>Thank you for joining EduFlow - Sri Lanka's premier O/L exam preparation platform.</p>
      <h3>What you can do on EduFlow:</h3>
      <ul>
        <li>📚 Access all O/L subjects in ${medium} medium</li>
        <li>🎥 Watch video lessons from expert tutors</li>
        <li>📝 Practice past papers (last 10 years)</li>
        <li>💬 Ask questions in subject forums</li>
        <li>📊 Track your progress and exam readiness</li>
      </ul>
      <p>Start your O/L journey today and achieve your best results!</p>
      <p style="margin-top: 30px;">
        <a href="https://eduflow.com" style="background-color: #4A90E2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Start Learning Now</a>
      </p>
      <p style="margin-top: 20px; font-size: 12px; color: #666;">
        © 2024 EduFlow | Empowering Sri Lankan Students
      </p>
    </div>
  `;
  return await sendEmail(to, subject, html);
};

// Password reset email template
const sendPasswordResetEmail = async (to, name, resetToken) => {
  const resetUrl = `https://eduflow.com/reset-password?token=${resetToken}`;
  const subject = 'EduFlow - Password Reset Request';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4A90E2;">Password Reset Request</h2>
      <p>Hello ${name},</p>
      <p>You requested to reset your password. Click the button below to create a new password:</p>
      <p>
        <a href="${resetUrl}" style="background-color: #4A90E2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
      </p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <p style="margin-top: 20px;">Best regards,<br>EduFlow Team</p>
    </div>
  `;
  return await sendEmail(to, subject, html);
};

// Assignment reminder email
const sendAssignmentReminder = async (to, name, assignmentTitle, dueDate) => {
  const subject = `📝 Reminder: "${assignmentTitle}" is due soon!`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #FF6B6B;">Assignment Reminder</h2>
      <p>Hello ${name},</p>
      <p>Don't forget! Your assignment <strong>"${assignmentTitle}"</strong> is due on <strong>${new Date(dueDate).toLocaleDateString()}</strong>.</p>
      <p>Complete it on time to stay on track for your O/L exam preparation!</p>
      <p>
        <a href="https://eduflow.com/assignments" style="background-color: #4A90E2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Assignments</a>
      </p>
      <p>Keep up the great work! 🔥</p>
    </div>
  `;
  return await sendEmail(to, subject, html);
};

// Weekly progress report email
const sendWeeklyProgressReport = async (to, name, progressData) => {
  const subject = '📊 Your Weekly O/L Progress Report';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4A90E2;">Weekly Progress Report</h2>
      <p>Hello ${name},</p>
      <p>Here's your learning summary for this week:</p>
      <ul>
        <li>📚 Subjects studied: ${progressData.subjectsStudied || 0}</li>
        <li>⏱️ Total study time: ${progressData.totalTime || 0} minutes</li>
        <li>✅ Lessons completed: ${progressData.lessonsCompleted || 0}</li>
        <li>📝 Assignments submitted: ${progressData.assignmentsSubmitted || 0}</li>
        <li>🎯 Quiz score average: ${progressData.avgQuizScore || 0}%</li>
      </ul>
      <p>Keep up the momentum! You're doing great! 💪</p>
      <p>
        <a href="https://eduflow.com/progress" style="background-color: #4A90E2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Detailed Report</a>
      </p>
    </div>
  `;
  return await sendEmail(to, subject, html);
};

// Certificate issued email
const sendCertificateEmail = async (to, name, courseTitle, certificateUrl) => {
  const subject = `🎓 Congratulations! You earned a certificate for ${courseTitle}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4A90E2;">Congratulations, ${name}! 🎉</h2>
      <p>You have successfully completed <strong>${courseTitle}</strong>!</p>
      <p>Your certificate is ready. Click the button below to download it:</p>
      <p>
        <a href="${certificateUrl}" style="background-color: #4A90E2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Download Certificate</a>
      </p>
      <p>Share your achievement with friends and family! 🌟</p>
      <p>Best of luck for your O/L examination!</p>
    </div>
  `;
  return await sendEmail(to, subject, html);
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendAssignmentReminder,
  sendWeeklyProgressReport,
  sendCertificateEmail,
};