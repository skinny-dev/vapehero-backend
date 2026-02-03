import express from 'express';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { orderLimiter } from '../middleware/rateLimit.js';
import { generateOrderId } from '../utils/orderId.js';
import { calculateVIPDiscount } from '../utils/vip.js';
import { reserveInventory, releaseInventory } from '../utils/inventory.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

// Import io from server (will be set after server initialization)
let ioInstance = null;
export const setIO = (io) => {
  ioInstance = io;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const prisma = new PrismaClient();

// تنظیمات multer برای آپلود فایل
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/receipts/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `receipt-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('فقط فایل‌های تصویری و PDF مجاز هستند'));
    }
  }
});

// GET /api/orders - لیست سفارشات کاربر جاری
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { user_id: req.user.id };
    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  image_main: true,
                },
              },
            },
          },
        },
        skip,
        take: parseInt(limit),
        orderBy: { created_at: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get Orders Error:', error);
    res.status(500).json({ error: 'خطا در دریافت سفارشات' });
  }
});

// POST /api/orders - ثبت سفارش جدید
router.post(
  '/',
  authenticate,
  orderLimiter,
  [
    body('items').isArray().notEmpty().withMessage('آیتم‌های سفارش الزامی است'),
    body('items.*.product_id').notEmpty().withMessage('شناسه محصول الزامی است'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('تعداد باید بیشتر از صفر باشد'),
    body('shipping_address').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { items, shipping_address } = req.body;
      const userId = req.user.id;

      // بررسی وضعیت کاربر
      if (req.user.status !== 'active') {
        return res.status(403).json({ error: 'حساب شما فعال نیست' });
      }

      // محاسبه مجموع سفارش
      let subtotal = 0;
      const orderItemsData = [];

      for (const item of items) {
        const product = await prisma.product.findUnique({
          where: { id: item.product_id }
        });

        if (!product) {
          return res.status(404).json({ error: `محصول با شناسه ${item.product_id} یافت نشد` });
        }

        if (!product.in_stock || product.stock_count < item.quantity) {
          return res.status(400).json({ error: `موجودی محصول ${product.name} کافی نیست` });
        }

        if (item.quantity < product.min_order) {
          return res.status(400).json({ 
            error: `حداقل تعداد سفارش برای ${product.name} برابر ${product.min_order} است` 
          });
        }

        // Parse price from string (SQLite stores Decimal as String)
        const price = Number(product.price);
        const itemTotal = price * item.quantity;
        subtotal += itemTotal;

        orderItemsData.push({
          product_id: product.id,
          quantity: item.quantity,
          price: product.price, // Store as string
          productSnapshot: {
            name: product.name,
            slug: product.slug,
            image_main: product.image_main,
            price: product.price
          }
        });
      }

      // محاسبه تخفیف VIP
      const { discountAmount, finalAmount } = await calculateVIPDiscount(userId, subtotal);

      // تولید شناسه سفارش
      const orderId = await generateOrderId();

      // رزرو موجودی
      try {
        for (const item of items) {
          await reserveInventory(item.product_id, item.quantity, orderId);
        }
      } catch (error) {
        return res.status(400).json({ error: error.message });
      }

      // ایجاد سفارش (convert numbers to strings for SQLite)
      const order = await prisma.order.create({
        data: {
          id: orderId,
          user_id: userId,
          status: 'pending_payment',
          total_amount: subtotal.toString(),
          discount_amount: discountAmount.toString(),
          final_amount: finalAmount.toString(),
          items: JSON.stringify(orderItemsData), // Stringify JSON for SQLite
          shipping_address: shipping_address || null,
          orderItems: {
            create: orderItemsData.map(item => ({
              product_id: item.product_id,
              quantity: item.quantity,
              price: item.price.toString() // Ensure string for SQLite
            }))
          }
        },
        include: {
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  image_main: true
                }
              }
            }
          }
        }
      });

      // ارسال notification به ادمین برای سفارش جدید
      console.log('🔍 Checking ioInstance:', !!ioInstance);
      if (ioInstance) {
        const finalAmount = typeof order.final_amount === 'string' 
          ? parseFloat(order.final_amount) 
          : Number(order.final_amount);
        const formattedAmount = isNaN(finalAmount) ? '0' : finalAmount.toLocaleString('fa-IR');
        
        const notification = {
          id: Date.now().toString(),
          type: 'order_new',
          title: 'سفارش جدید: ' + order.id,
          description: `سفارش جدید از ${req.user.store_name || req.user.name || 'کاربر'} به مبلغ ${formattedAmount} تومان ثبت شد.`,
          link: `/admin/orders/${order.id}`,
          orderId: order.id,
          userId: req.user.id,
          timestamp: new Date().toISOString()
        };
        
        console.log('📢 Emitting notification to admin room:', notification);
        ioInstance.to('admin').emit('notification', notification);
        console.log('✅ Notification emitted successfully');
      } else {
        console.error('❌ ioInstance is null - notification not sent!');
        console.error('   Make sure setOrdersIO(io) is called in server.js');
      }

      // ارسال notification به کاربر
      if (ioInstance) {
        ioInstance.to(`user:${userId}`).emit('notification', {
          id: Date.now().toString(),
          type: 'order_new',
          title: 'سفارش شما ثبت شد',
          description: `سفارش ${order.id} با موفقیت ثبت شد. لطفا فیش واریزی را آپلود کنید.`,
          link: `/profile/orders/${order.id}`,
          orderId: order.id,
          timestamp: new Date().toISOString()
        });
      }

      res.status(201).json({
        message: 'سفارش با موفقیت ثبت شد. لطفا فیش واریزی را آپلود کنید.',
        order
      });
    } catch (error) {
      console.error('Create Order Error:', error);
      res.status(500).json({ error: 'خطا در ثبت سفارش' });
    }
  }
);

// PUT /api/orders/:id/upload-receipt - آپلود فیش واریزی
router.put(
  '/:id/upload-receipt',
  authenticate,
  upload.single('receipt'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'فایل فیش الزامی است' });
      }

      const orderId = req.params.id;
      const order = await prisma.order.findUnique({
        where: { id: orderId }
      });

      if (!order) {
        return res.status(404).json({ error: 'سفارش یافت نشد' });
      }

      if (order.user_id !== req.user.id) {
        return res.status(403).json({ error: 'دسترسی غیرمجاز' });
      }

      // در اینجا باید فایل را به S3 یا storage ابری آپلود کنید
      // فعلا فقط مسیر محلی را ذخیره می‌کنیم
      const receiptUrl = `/uploads/receipts/${req.file.filename}`;

      // ذخیره اطلاعات فیش
      await prisma.receipt.create({
        data: {
          order_id: orderId,
          user_id: req.user.id,
          image_url: receiptUrl
        }
      });

      // به‌روزرسانی سفارش
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { receipt_url: receiptUrl }
      });

      res.json({
        message: 'فیش واریزی با موفقیت آپلود شد. در انتظار تایید ادمین هستید.',
        order: updatedOrder
      });
    } catch (error) {
      console.error('Upload Receipt Error:', error);
      res.status(500).json({ error: 'خطا در آپلود فیش' });
    }
  }
);

// GET /api/orders/:id - جزئیات یک سفارش
router.get('/:id', authenticate, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                image_main: true
              }
            }
          }
        },
        receipts: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'سفارش یافت نشد' });
    }

    if (order.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }

    res.json(order);
  } catch (error) {
    console.error('Get Order Error:', error);
    res.status(500).json({ error: 'خطا در دریافت سفارش' });
  }
});

export default router;

