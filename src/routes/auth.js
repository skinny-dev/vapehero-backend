import express from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { otpLimiter } from '../middleware/rateLimit.js';
import { sendOTP } from '../utils/sms.js';
import { setOTP, getOTP, deleteOTP } from '../utils/redis.js';

const router = express.Router();
const prisma = new PrismaClient();

// تولید کد OTP 5 رقمی
const generateOTP = () => {
  const isTestMode =
    process.env.NODE_ENV === 'development' || process.env.SMS_TEST_MODE === 'true';

  // In development / test mode, always use a fixed demo code
  if (isTestMode) {
    return '55555';
  }

  // In production, generate a random 5‑digit code
  return Math.floor(10000 + Math.random() * 90000).toString();
};

// POST /api/auth/send-otp
router.post(
  '/send-otp',
  otpLimiter,
  [
    body('phone')
      .isMobilePhone('fa-IR')
      .withMessage('شماره موبایل معتبر نیست')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { phone } = req.body;
      const code = generateOTP();

      // ذخیره OTP در Redis
      await setOTP(phone, code);

      // ارسال SMS
      try {
        await sendOTP(phone, code);
      } catch (smsError) {
        console.error('SMS Sending Error:', smsError);
        // در حالت development، خطا را نادیده می‌گیریم و ادامه می‌دهیم
        if (process.env.NODE_ENV === 'development' || process.env.SMS_TEST_MODE === 'true') {
          console.log('⚠️ SMS sending failed, but continuing in development mode');
        } else {
          // در production، خطا را برمی‌گردانیم
          return res.status(500).json({ 
            error: 'خطا در ارسال پیامک. لطفا دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.',
            details: smsError.message 
          });
        }
      }

      res.json({
        message: 'کد تایید ارسال شد',
        // در حالت development، کد را برمی‌گردانیم
        ...(process.env.NODE_ENV === 'development' && { code })
      });
    } catch (error) {
      console.error('Send OTP Error:', error);
      res.status(500).json({ 
        error: error.message || 'خطا در ارسال کد تایید',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// POST /api/auth/verify-otp
router.post(
  '/verify-otp',
  [
    body('phone').isMobilePhone('fa-IR'),
    body('code').isLength({ min: 5, max: 5 }).isNumeric()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { phone, code } = req.body;

      // Test mode: Accept fixed demo code in development
      const TEST_OTP_CODES = ['55555'];
      const isTestMode = process.env.NODE_ENV === 'development' || process.env.SMS_TEST_MODE === 'true';
      const isTestCode = TEST_OTP_CODES.includes(code);

      // بررسی OTP
      let isValidOTP = false;
      
      if (isTestMode && isTestCode) {
        // In test mode, accept test codes without checking Redis
        console.log(`✅ Test OTP code accepted: ${code} for ${phone}`);
        isValidOTP = true;
      } else {
        // Normal OTP verification from Redis
        const storedCode = await getOTP(phone);
        isValidOTP = storedCode && storedCode === code;
      }

      if (!isValidOTP) {
        return res.status(401).json({ error: 'کد تایید نامعتبر است' });
      }

      // حذف OTP استفاده شده (only if not test code)
      if (!isTestCode) {
        await deleteOTP(phone);
      }

      // پیدا کردن یا ایجاد کاربر
      let user = await prisma.user.findUnique({
        where: { phone }
      });

      if (!user) {
        // ایجاد کاربر جدید با وضعیت pending
        user = await prisma.user.create({
          data: {
            phone,
            status: 'pending'
          }
        });
        
        // ارسال notification به ادمین برای کاربر جدید (فقط شماره موبایل دارد)
        console.log('🔍 New user created, checking ioInstance:', !!ioInstance);
        if (ioInstance) {
          const notification = {
            id: Date.now().toString(),
            type: 'user_reg',
            title: 'کاربر جدید: ' + phone,
            description: `کاربر جدید با شماره ${phone} ثبت‌نام کرد و منتظر تکمیل اطلاعات است.`,
            link: `/admin/users/${user.id}`,
            userId: user.id,
            timestamp: new Date().toISOString()
          };
          
          console.log('📢 Emitting notification for new user (verify-otp):', notification);
          ioInstance.to('admin').emit('notification', notification);
          console.log('✅ New user notification emitted successfully');
        } else {
          console.error('❌ ioInstance is null in verify-otp - notification not sent!');
        }
      }

      // تولید JWT Token
      const token = jwt.sign(
        { userId: user.id, phone: user.phone },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          store_name: user.store_name,
          role: user.role,
          status: user.status,
          vip_level: user.vip_level
        }
      });
    } catch (error) {
      console.error('Verify OTP Error:', error);
      res.status(500).json({ error: 'خطا در تایید کد' });
    }
  }
);

// Import io from server (will be set after server initialization)
let ioInstance = null;
export const setIO = (io) => {
  ioInstance = io;
};

// POST /api/auth/register
router.post(
  '/register',
  [
    body('name').notEmpty().withMessage('نام الزامی است'),
    body('store_name').notEmpty().withMessage('نام فروشگاه الزامی است')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // احراز هویت لازم است
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const { name, store_name } = req.body;

      const user = await prisma.user.update({
        where: { id: decoded.userId },
        data: {
          name,
          store_name,
          status: 'pending' // در انتظار تایید ادمین
        }
      });

      // ارسال notification به ادمین برای ثبت‌نام جدید
      console.log('🔍 Checking ioInstance for user registration:', !!ioInstance);
      if (ioInstance) {
        const notification = {
          id: Date.now().toString(),
          type: 'user_reg',
          title: 'همکار جدید: ' + (user.store_name || user.name || 'بدون نام'),
          description: `درخواست تایید هویت برای ${user.name || 'کاربر'} با شماره ${user.phone} ثبت شده است.`,
          link: `/admin/users/${user.id}`,
          userId: user.id,
          timestamp: new Date().toISOString()
        };
        
        console.log('📢 Emitting notification to admin room:', notification);
        ioInstance.to('admin').emit('notification', notification);
        console.log('✅ User registration notification emitted successfully');
      } else {
        console.error('❌ ioInstance is null - notification not sent!');
        console.error('   Make sure setAuthIO(io) is called in server.js');
      }

      res.json({
        message: 'اطلاعات با موفقیت ثبت شد. در انتظار تایید ادمین هستید.',
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          store_name: user.store_name,
          status: user.status
        }
      });
    } catch (error) {
      console.error('Register Error:', error);
      res.status(500).json({ error: 'خطا در ثبت اطلاعات' });
    }
  }
);

export default router;


