const rateLimit = require('express-rate-limit');

/**
 * Auth rate limiter: Prevents brute-force login attempts
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Max 20 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  },
});

/**
 * General API rate limiter
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // 500 requests per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down and try again shortly.',
  },
});

/**
 * AI Gateway rate limiter
 */
const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 AI queries per minute per user/IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'AI query rate limit reached. Please wait a moment before sending another prompt.',
  },
});

module.exports = {
  authLimiter,
  apiLimiter,
  aiLimiter,
};
