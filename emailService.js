const nodemailer = require('nodemailer');
require('dotenv').config(); // To use environment variables

// Configure nodemailer transporter with GoDaddy SMTP
const transporter = nodemailer.createTransport({
  host: 'smtpout.secureserver.net',  // GoDaddy SMTP
  port: 465,                          // Use port 465 for secure connection
  secure: true,                       // True for TLS
  auth: {
    user: process.env.EMAIL_USER,     // Admin email
    pass: process.env.EMAIL_PASS,     // Admin email password
  },
});

// Function to send email
const sendEmail = async (userEmail, userMessage) => {
  const mailOptions = {
    from: userEmail,  // Use the user's email as the sender
    to: 'info@maibil.in',  // Admin email
    subject: 'New Message from Contact Form',
    text: `You have received a new message from ${userEmail}: \n\n${userMessage}`,
  };

  try {
    let info = await transporter.sendMail(mailOptions);  // Await for email to send
    console.log('Email sent: ' + info.response);
    return { success: true, message: 'Email sent successfully!' };
  } catch (error) {
    console.error('Error sending email:', error);        // Log errors for troubleshooting
    throw new Error('Error sending email: ' + error.message);
  }
};

module.exports = { sendEmail };
