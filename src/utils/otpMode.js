/**
 * "OTP development" behavior: fixed code 55555, optional echoed code in send-otp,
 * SMS failures tolerated, console-only SMS in sms.js.
 *
 * Enabled when any of:
 * - OTP_MODE=development (explicit; allows prod + test OTP — remove when going live)
 * - SMS_TEST_MODE=true
 * - NODE_ENV=development
 */
export const isOtpDevelopmentMode = () => {
  const mode = process.env.OTP_MODE?.trim().toLowerCase();
  if (mode === 'development') return true;
  if (process.env.SMS_TEST_MODE === 'true') return true;
  if (process.env.NODE_ENV === 'development') return true;
  return false;
};
