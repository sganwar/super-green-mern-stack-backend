const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
// const rateLimit = require('express-rate-limit');
require("dotenv").config();
const connectDB = require("./config/database.config.js");
const webhookRoutes = require("./routes/webhookRoutes");
const couponRoutes = require("./routes/couponRoutes");
const Sentry = require("@sentry/node");
const couponRateLimit = require("./middlewares/rateLimit");

// Initialize Sentry
if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN });
}

const app = express();

// Sentry middleware - must be the first middleware
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}
// Security Middleware
app.use(helmet());

// Rate Limiting in server not needed for serverless deployment
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 100,
//   message: 'Too many requests from this IP, please try again later.',
// });
// app.use(limiter);

// CORS Configuration
const corsOptions = {
  origin: process.env.FRONTEND_URLS.split(","),
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Body Parser Middleware (Crucial for webhook signature verification
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// Database Connection
connectDB();

// API Routes, Routes should be before Sentry error handler and after all setup middleware

app.use("/api/webhook", webhookRoutes);
app.use("/api/coupon", couponRateLimit, couponRoutes);

// Health Check Route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Server is up and running!" });
});

// Add this route temporarily to test Sentry
app.get("/debug-sentry", function mainHandler(req, res) {
  throw new Error("My first Sentry error!");
});

// Global 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: "API endpoint not found" });
});

// Sentry ErrorHandler - must be before your custom error middleware
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

// Global Error Handling Middleware
app.use((error, req, res, next) => {
  console.error("🛑 Global Error Handler:", error);
  res.status(500).json({ success: false, message: "Internal Server Error" });
});

// Start the Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Allowed CORS origin: ${process.env.FRONTEND_URL}`);
});
