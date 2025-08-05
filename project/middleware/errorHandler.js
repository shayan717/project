module.exports = (err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({ message: "Server Error", error: err.message });
};
