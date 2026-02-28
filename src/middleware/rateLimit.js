import rateLimit from 'express-rate-limit';

const isTestOrDev =
  process.env.NODE_ENV === 'development' || process.env.SMS_TEST_MODE === 'true';

// Rate limiter for OTP send only (protects SMS quota; verify-otp uses authLimiter)
export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTestOrDev ? 30 : 10, // 30 in test/dev, 10 in production per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, _next, options) => {
    res.status(429).json({
      error: 'تعداد درخواست ارسال کد بیش از حد است. لطفاً ۱۵ دقیقه دیگر تلاش کنید.',
    });
  },
});

// Rate limiter for order creation
export const orderLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 orders per minute
  message: 'Too many order requests, please slow down',
});


