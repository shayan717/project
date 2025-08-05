const express = require("express");
const router = express.Router();
const auth = require("../controllers/authController");
router.post("/signup", auth.signup);
router.get("/confirm/:token", auth.confirmEmail);
router.post("/login", auth.login);
router.post("/forgot-password", auth.forgotPassword);
router.post("/reset-password/:token", auth.resetPassword);
module.exports = router;
