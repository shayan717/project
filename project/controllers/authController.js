const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const sendEmail = require("../services/emailService");
const JWT_SECRET = process.env.JWT_SECRET;
exports.signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      isVerified: false,
    });
    const token = jwt.sign({ userId: newUser._id }, JWT_SECRET, { expiresIn: "1d" });
    const confirmURL = `http://localhost:8000/api/auth/confirm/${token}`;

    await sendEmail({
      to: email,
      subject: "Please confirm your email",
      html: `
        <h1>Welcome, ${name}!</h1>
        <p>Click below to verify your email:</p>
        <a href="${confirmURL}">Confirm Email</a>
      `,
    });

    res.status(201).json({ message: "Signup successful. Please verify your email." });
  } catch (err) {
    next(err);
  }
};
exports.confirmEmail = async (req, res, next) => {
  try {
    const { token } = req.params;
    const decoded = jwt.verify(token, JWT_SECRET);
    await User.findByIdAndUpdate(decoded.userId, { isVerified: true });
    res.send("<h1>Email Verified Successfully!</h1>");
  } catch (err) {
    res.status(400).send("<h1>Invalid or Expired Token</h1>");
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });
    if (!user.isVerified)
      return res.status(401).json({ message: "Please verify your email first" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const accessToken = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "7d" });

    res.json({ message: "Login successful", accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "10m" });
    const resetURL = `http://localhost:8000/api/auth/reset-password/${token}`;

    await sendEmail({
      to: email,
      subject: "Reset Your Password",
      html: `
        <h1>Reset Password</h1>
        <p>Click the link below to reset your password:</p>
        <a href="${resetURL}">Reset Password</a>
      `,
    });

    res.json({ message: "Password reset link sent!" });
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    const decoded = jwt.verify(token, JWT_SECRET);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const user = await User.findByIdAndUpdate(decoded.userId, {
      password: hashedPassword,
    }, { new: true });

    await sendEmail({
      to: user.email,
      subject: "Password Reset Successful",
      html: `<h1>Hello ${user.name},</h1><p>Your password has been updated.</p>`,
    });

    res.json({ message: "Password reset successfully." });
  } catch (err) {
    res.status(400).json({ message: "Invalid or expired token" });
  }
};
