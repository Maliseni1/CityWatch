const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto'); // Built-in Node module

// 1. SETUP EMAIL SENDER (Using Gmail for simplicity)
// You need a generic Gmail account and an "App Password" (not your main login pass)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // e.g., 'citywatch.alerts@gmail.com'
    pass: process.env.EMAIL_PASS  // e.g., 'abcd efgh ijkl mnop'
  }
});

// 2. REGISTER
router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body; // Added email
    if (!username || !password || !email) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) return res.status(400).json({ message: "User or Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 3. LOGIN
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, username: user.username });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 4. FORGOT PASSWORD (Request Link)
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate Token
    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send Email
    // NOTE: In production, change the URL to your actual frontend URL
    const resetUrl = `http://localhost:5173/reset/${token}`; 
    
    const mailOptions = {
      to: user.email,
      from: process.env.EMAIL_USER,
      subject: 'CityWatch Password Reset',
      text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n` +
            `Please use the token below to reset your password:\n\n` +
            `Token: ${token}\n\n` +
            `If you did not request this, please ignore this email.`
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Recovery email sent' });

  } catch (err) {
    console.error("Forgot Pass Error:", err);
    res.status(500).json({ message: 'Error sending email' });
  }
});

// 5. RESET PASSWORD (Verify Token & Update)
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() } // Check if token is still valid (time)
    });

    if (!user) return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Password successfully updated' });
  } catch (err) {
    console.error("Reset Pass Error:", err);
    res.status(500).json({ message: 'Error resetting password' });
  }
});

module.exports = router;