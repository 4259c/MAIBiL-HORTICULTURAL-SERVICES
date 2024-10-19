const express = require('express');
const cors = require('cors');
const multer = require('multer');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const { sendEmail } = require('./emailService');

const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure multer for file storage with 500KB file size limit
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 },
});

// Database connection
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Utility function for error handling
const handleError = (res, error, message) => {
  console.error(error);
  res.status(500).json({ success: false, message });
};

// Route to upload PDF
app.post('/upload-pdf', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded or file too large. Maximum size is 500KB.' });
  }

  const filePath = path.join(__dirname, 'uploads', req.file.filename);
  const fileName = req.file.filename;

  try {
    await db.query('INSERT INTO pdf_uploads (file_name, file_path) VALUES (?, ?)', [fileName, filePath]);
    res.json({ success: true, message: 'File uploaded successfully!', fileName });
  } catch (err) {
    handleError(res, err, 'Error saving file info to database');
  }
});

// Route to add notifications
app.post('/add-notification', async (req, res) => {
  const { title, message } = req.body;

  try {
    await db.query('INSERT INTO notifications (title, message) VALUES (?, ?)', [title, message]);
    res.json({ success: true, message: 'Notification added successfully!' });
  } catch (err) {
    handleError(res, err, 'Error adding notification to database');
  }
});

// Route to fetch notifications and PDFs
app.get('/fetch-data', async (req, res) => {
  try {
    const [notifications] = await db.query('SELECT * FROM notifications ORDER BY created_at DESC');
    const [pdfs] = await db.query('SELECT * FROM pdf_uploads ORDER BY upload_time DESC');
    res.json({ success: true, notifications, pdfs });
  } catch (err) {
    handleError(res, err, 'Error fetching data');
  }
});

// Route to delete notification
app.delete('/delete-notification/:id', async (req, res) => {
  const id = req.params.id;

  try {
    await db.query('DELETE FROM notifications WHERE id = ?', [id]);
    res.json({ success: true, message: 'Notification deleted successfully!' });
  } catch (err) {
    handleError(res, err, 'Error deleting notification');
  }
});

// Route to delete PDF
app.delete('/delete-pdf/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const [pdf] = await db.query('SELECT * FROM pdf_uploads WHERE id = ?', [id]);
    if (pdf.length === 0) {
      return res.status(404).json({ success: false, message: 'PDF not found' });
    }

    const filePath = path.join(__dirname, 'uploads', pdf[0].file_name);
    fs.unlink(filePath, async (err) => {
      if (err) {
        return handleError(res, err, 'Error deleting PDF file');
      }
      await db.query('DELETE FROM pdf_uploads WHERE id = ?', [id]);
      res.json({ success: true, message: 'PDF deleted successfully!' });
    });
  } catch (err) {
    handleError(res, err, 'Error deleting PDF from database');
  }
});

// Route to fetch notification count
app.get('/fetch-notification-count', async (req, res) => {
  try {
    const [notifications] = await db.query('SELECT * FROM notifications ORDER BY created_at DESC');
    const count = notifications.length;
    res.json({ success: true, count, notifications });
  } catch (error) {
    handleError(res, error, 'Failed to fetch notifications');
  }
});

// Route to handle booking and send email
app.post('/send-email', async (req, res) => {
  const { userEmail, userMessage } = req.body;

  try {
    const result = await sendEmail(userEmail, userMessage);
    res.status(200).json({ success: true, result });
  } catch (error) {
    handleError(res, error, 'Failed to send email');
  }
});

// Check required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    console.error(`Error: ${envVar} is not defined.`);
    process.exit(1);
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
