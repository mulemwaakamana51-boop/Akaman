require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");

const authRoutes = require("./routes/auth");
const contentRoutes = require("./routes/content");
const paymentRoutes = require("./routes/payments");
const uploadRoutes = require("./routes/upload");
const userRoutes = require("./routes/users");

const app = express();

// ── Security ────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: "Too many requests" }));

// ── Body parsing (raw for Stripe webhooks) ───────────────────────
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ───────────────────────────────────────────────────────
app.use("/api/auth",     authRoutes);
app.use("/api/content",  contentRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/upload",   uploadRoutes);
app.use("/api/users",    userRoutes);

// ── Health check ─────────────────────────────────────────────────
app.get("/health", (req, res) => res.json({ status: "ok", platform: "Akamana" }));

// ── Global error handler ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

// ── Database + Start ─────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(process.env.PORT || 5000, () =>
      console.log(`🚀 Akamana server running on port ${process.env.PORT || 5000}`)
    );
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

module.exports = app;
