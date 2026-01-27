import express from 'express';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { sendNotification } from '../utils/sms.js';
import { updateInventoryAfterPayment } from '../utils/inventory.js';
import { updateVIPLevel } from '../utils/vip.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const prisma = new PrismaClient();

// Socket.io instance (will be set from server.js)
let ioInstance = null;
export const setIO = (io) => {
  ioInstance = io;
};

// تنظیمات multer برای آپلود فایل
const mediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/media/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const uploadMedia = multer({
  storage: mediaStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|mp4|mp3|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('فقط فایل‌های تصویری، ویدیو و PDF مجاز هستند'));
    }
  }
});

// همه route های admin نیازمند احراز هویت و نقش admin هستند
router.use(authenticate);
router.use(requireAdmin);

// GET /api/admin/stats - آمار داشبورد
router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      pendingUsers,
      totalOrders,
      pendingOrders,
      totalRevenue,
      monthlyRevenue
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'pending' } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: { in: ['pending_payment', 'paid'] } } }),
      prisma.order.aggregate({
        where: { status: { in: ['paid', 'processing', 'shipped'] } },
        _sum: { final_amount: true }
      }),
      prisma.order.aggregate({
        where: {
          status: { in: ['paid', 'processing', 'shipped'] },
          created_at: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        },
        _sum: { final_amount: true }
      })
    ]);

    res.json({
      users: {
        total: totalUsers,
        pending: pendingUsers
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders
      },
      revenue: {
        total: totalRevenue._sum.final_amount || 0,
        monthly: monthlyRevenue._sum.final_amount || 0
      }
    });
  } catch (error) {
    console.error('Get Stats Error:', error);
    res.status(500).json({ error: 'خطا در دریافت آمار' });
  }
});

// ========== مدیریت دسته‌بندی‌ها ==========

// GET /api/admin/categories
router.get('/categories', async (req, res) => {
  try {
    const { page = 1, limit = 50, parent_id, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (parent_id !== undefined) {
      where.parent_id = parent_id === 'null' ? null : parent_id;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { slug: { contains: search } }
      ];
    }

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        include: {
          parent: true,
          children: true,
          _count: {
            select: { products: true }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { order: 'asc' }
      }),
      prisma.category.count({ where })
    ]);

    res.json({
      categories,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get Categories Error:', error);
    res.status(500).json({ error: 'خطا در دریافت دسته‌بندی‌ها' });
  }
});

// GET /api/admin/categories/:id
router.get('/categories/:id', async (req, res) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: {
        parent: true,
        children: true,
        _count: {
          select: { products: true }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'دسته‌بندی یافت نشد' });
    }

    res.json(category);
  } catch (error) {
    console.error('Get Category Error:', error);
    res.status(500).json({ error: 'خطا در دریافت دسته‌بندی' });
  }
});

// POST /api/admin/categories
router.post(
  '/categories',
  [
    body('name').notEmpty().withMessage('نام الزامی است'),
    body('slug').notEmpty().withMessage('slug الزامی است')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const category = await prisma.category.create({
        data: req.body
      });

      res.status(201).json(category);
    } catch (error) {
      console.error('Create Category Error:', error);
      res.status(500).json({ error: 'خطا در ایجاد دسته‌بندی' });
    }
  }
);

// PUT /api/admin/categories/:id
router.put('/categories/:id', async (req, res) => {
  try {
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: req.body
    });

    res.json(category);
  } catch (error) {
    console.error('Update Category Error:', error);
    res.status(500).json({ error: 'خطا در به‌روزرسانی دسته‌بندی' });
  }
});

// DELETE /api/admin/categories/:id
router.delete('/categories/:id', async (req, res) => {
  try {
    // بررسی وجود محصولات
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: { products: true, children: true }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'دسته‌بندی یافت نشد' });
    }

    if (category._count.products > 0) {
      return res.status(400).json({ 
        error: 'نمی‌توان دسته‌بندی دارای محصول را حذف کرد' 
      });
    }

    if (category._count.children > 0) {
      return res.status(400).json({ 
        error: 'نمی‌توان دسته‌بندی دارای زیرمجموعه را حذف کرد' 
      });
    }

    await prisma.category.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'دسته‌بندی حذف شد' });
  } catch (error) {
    console.error('Delete Category Error:', error);
    res.status(500).json({ error: 'خطا در حذف دسته‌بندی' });
  }
});

// ========== مدیریت محصولات ==========

// GET /api/admin/products
router.get('/products', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (category) {
      where.category_id = category;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true },
        skip,
        take: parseInt(limit),
        orderBy: { created_at: 'desc' }
      }),
      prisma.product.count({ where })
    ]);

    // Parse JSON fields
    const parsedProducts = products.map(product => ({
      ...product,
      properties: product.properties ? JSON.parse(product.properties) : null,
      colors: product.colors ? JSON.parse(product.colors) : null
    }));

    res.json({
      products: parsedProducts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get Products Error:', error);
    res.status(500).json({ error: 'خطا در دریافت محصولات' });
  }
});

// POST /api/admin/products
router.post(
  '/products',
  [
    body('name').notEmpty(),
    body('slug').notEmpty(),
    body('price').notEmpty(),
    body('category_id').notEmpty(),
    body('stock_count').isInt({ min: 0 }),
    body('min_order').isInt({ min: 1 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const productData = {
        ...req.body,
        price: req.body.price.toString(), // Convert to string for SQLite
        properties: req.body.properties ? JSON.stringify(req.body.properties) : null,
        colors: req.body.colors ? JSON.stringify(req.body.colors) : null
      };

      const product = await prisma.product.create({
        data: productData
      });

      res.status(201).json(product);
    } catch (error) {
      console.error('Create Product Error:', error);
      res.status(500).json({ error: 'خطا در ایجاد محصول' });
    }
  }
);

// PUT /api/admin/products/:id
router.put('/products/:id', async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    // Convert price to string for SQLite
    if (updateData.price !== undefined) {
      updateData.price = updateData.price.toString();
    }
    
    // Stringify JSON fields
    if (updateData.properties !== undefined) {
      updateData.properties = updateData.properties ? JSON.stringify(updateData.properties) : null;
    }
    if (updateData.colors !== undefined) {
      updateData.colors = updateData.colors ? JSON.stringify(updateData.colors) : null;
    }

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: updateData
    });

    // Parse JSON fields in response
    const parsedProduct = {
      ...product,
      properties: product.properties ? JSON.parse(product.properties) : null,
      colors: product.colors ? JSON.parse(product.colors) : null
    };

    res.json(parsedProduct);
  } catch (error) {
    console.error('Update Product Error:', error);
    res.status(500).json({ error: 'خطا در به‌روزرسانی محصول' });
  }
});

// DELETE /api/admin/products/:id
router.delete('/products/:id', async (req, res) => {
  try {
    await prisma.product.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'محصول حذف شد' });
  } catch (error) {
    console.error('Delete Product Error:', error);
    res.status(500).json({ error: 'خطا در حذف محصول' });
  }
});

// PATCH /api/admin/products/:id/stock - به‌روزرسانی موجودی
router.patch('/products/:id/stock', async (req, res) => {
  try {
    const { stock_count, in_stock } = req.body;

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        stock_count: stock_count !== undefined ? stock_count : undefined,
        in_stock: in_stock !== undefined ? in_stock : undefined
      }
    });

    res.json(product);
  } catch (error) {
    console.error('Update Stock Error:', error);
    res.status(500).json({ error: 'خطا در به‌روزرسانی موجودی' });
  }
});

// PATCH /api/admin/products/:id/status - تغییر وضعیت نمایش در سایت
router.patch('/products/:id/status', async (req, res) => {
  try {
    const { is_active } = req.body;

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        is_active: is_active !== undefined ? is_active : undefined
      }
    });

    res.json(product);
  } catch (error) {
    console.error('Update Product Status Error:', error);
    res.status(500).json({ error: 'خطا در تغییر وضعیت محصول' });
  }
});

// ========== مدیریت کاربران ==========

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { phone: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { store_name: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          phone: true,
          name: true,
          store_name: true,
          role: true,
          status: true,
          vip_level: true,
          total_spent: true,
          created_at: true
        }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get Users Error:', error);
    res.status(500).json({ error: 'خطا در دریافت کاربران' });
  }
});

// PATCH /api/admin/users/:id/approve - تایید کاربر
router.patch('/users/:id/approve', async (req, res) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { status: 'active' }
    });

    // ارسال SMS اطلاع‌رسانی
    await sendNotification(
      user.phone,
      `حساب شما در VapeHero تایید شد. اکنون می‌توانید از خدمات ما استفاده کنید.`
    );

    res.json({
      message: 'کاربر تایید شد و SMS ارسال شد',
      user
    });
  } catch (error) {
    console.error('Approve User Error:', error);
    res.status(500).json({ error: 'خطا در تایید کاربر' });
  }
});

// GET /api/admin/users/:id
router.get('/users/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: { orders: true, posts: true }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'کاربر یافت نشد' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get User Error:', error);
    res.status(500).json({ error: 'خطا در دریافت کاربر' });
  }
});

// PUT /api/admin/users/:id
router.put('/users/:id', async (req, res) => {
  try {
    const { name, store_name, role, status, vip_level, wallet_balance } = req.body;
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (store_name !== undefined) updateData.store_name = store_name;
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;
    if (vip_level !== undefined) updateData.vip_level = vip_level;
    if (wallet_balance !== undefined) updateData.wallet_balance = wallet_balance.toString();

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json(user);
  } catch (error) {
    console.error('Update User Error:', error);
    res.status(500).json({ error: 'خطا در به‌روزرسانی کاربر' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    // بررسی وجود سفارشات
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: { orders: true }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'کاربر یافت نشد' });
    }

    if (user._count.orders > 0) {
      return res.status(400).json({ 
        error: 'نمی‌توان کاربر دارای سفارش را حذف کرد. بهتر است حساب را غیرفعال کنید.' 
      });
    }

    await prisma.user.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'کاربر حذف شد' });
  } catch (error) {
    console.error('Delete User Error:', error);
    res.status(500).json({ error: 'خطا در حذف کاربر' });
  }
});

// PATCH /api/admin/users/:id/reject - رد کاربر
router.patch('/users/:id/reject', async (req, res) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { status: 'rejected' }
    });

    res.json({
      message: 'کاربر رد شد',
      user
    });
  } catch (error) {
    console.error('Reject User Error:', error);
    res.status(500).json({ error: 'خطا در رد کاربر' });
  }
});

// ========== مدیریت سفارشات ==========

// GET /api/admin/orders
router.get('/orders', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              phone: true,
              name: true,
              store_name: true
            }
          },
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true
                }
              }
            }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { created_at: 'desc' }
      }),
      prisma.order.count({ where })
    ]);

    res.json({
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get Orders Error:', error);
    res.status(500).json({ error: 'خطا در دریافت سفارشات' });
  }
});

// PATCH /api/admin/orders/:id/status - تغییر وضعیت سفارش
router.patch('/orders/:id/status', async (req, res) => {
  try {
    const { status, tracking_code } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { user: true }
    });

    if (!order) {
      return res.status(404).json({ error: 'سفارش یافت نشد' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        status,
        tracking_code: tracking_code || order.tracking_code
      }
    });

    // اگر وضعیت به paid تغییر کرد، موجودی را به‌روزرسانی کن
    if (status === 'paid' && order.status !== 'paid') {
      await updateInventoryAfterPayment(order.id);

      // به‌روزرسانی total_spent کاربر و سطح VIP
      const currentTotal = Number(order.user.total_spent || '0');
      const finalAmount = Number(order.final_amount);
      await prisma.user.update({
        where: { id: order.user_id },
        data: {
          total_spent: (currentTotal + finalAmount).toString()
        }
      });

      await updateVIPLevel(order.user_id);
    }

    // ارسال SMS در صورت تغییر وضعیت به shipped
    if (status === 'shipped' && tracking_code) {
      await sendNotification(
        order.user.phone,
        `سفارش شما با کد رهگیری ${tracking_code} ارسال شد.`
      );
    }

    res.json(updatedOrder);
  } catch (error) {
    console.error('Update Order Status Error:', error);
    res.status(500).json({ error: 'خطا در به‌روزرسانی وضعیت سفارش' });
  }
});

// ========== تنظیمات ==========

// GET /api/admin/settings
router.get('/settings', async (req, res) => {
  try {
    const settings = await prisma.setting.findMany();
    const settingsMap = {};
    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    res.json(settingsMap);
  } catch (error) {
    console.error('Get Settings Error:', error);
    res.status(500).json({ error: 'خطا در دریافت تنظیمات' });
  }
});

// PUT /api/admin/settings
router.put('/settings', async (req, res) => {
  try {
    const settings = req.body;

    for (const [key, value] of Object.entries(settings)) {
      // Stringify JSON values for SQLite
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;
      await prisma.setting.upsert({
        where: { key },
        update: { value: stringValue },
        create: { key, value: stringValue }
      });
    }

    res.json({ message: 'تنظیمات به‌روزرسانی شد' });
  } catch (error) {
    console.error('Update Settings Error:', error);
    res.status(500).json({ error: 'خطا در به‌روزرسانی تنظیمات' });
  }
});

// GET /api/admin/vip-tiers - دریافت تنظیمات سطوح VIP
router.get('/vip-tiers', async (req, res) => {
  try {
    const vipTiersSetting = await prisma.setting.findUnique({
      where: { key: 'vip_tiers' }
    });

    if (vipTiersSetting) {
      const tiers = JSON.parse(vipTiersSetting.value);
      res.json({ tiers });
    } else {
      // Default tiers if not set
      const defaultTiers = [
        {
          id: 'Bronze',
          name: 'همکار برنزی',
          minSpent: 0,
          discount: 0,
          benefits: ['دسترسی به قیمت عمده پایه', 'پشتیبانی تیکتی', 'ارسال تیپاکس']
        },
        {
          id: 'Silver',
          name: 'همکار نقره‌ای',
          minSpent: 50000000,
          discount: 3,
          benefits: ['۳٪ تخفیف روی کل فاکتور', 'اولویت در تامین موجودی', 'ارسال رایگان ماهانه']
        },
        {
          id: 'Gold',
          name: 'همکار طلایی',
          minSpent: 200000000,
          discount: 5,
          benefits: ['۵٪ تخفیف روی کل فاکتور', 'مدیر فروش اختصاصی', 'هدایای تبلیغاتی برندها']
        },
        {
          id: 'Diamond',
          name: 'همکار الماس',
          minSpent: 500000000,
          discount: 10,
          benefits: ['۱۰٪ تخفیف روی کل فاکتور', 'خرید اعتباری (چکی)', 'شرکت در قرعه‌کشی سالانه']
        }
      ];
      res.json({ tiers: defaultTiers });
    }
  } catch (error) {
    console.error('Get VIP Tiers Error:', error);
    res.status(500).json({ error: 'خطا در دریافت سطوح VIP' });
  }
});

// PUT /api/admin/vip-tiers - به‌روزرسانی تنظیمات سطوح VIP
router.put('/vip-tiers', async (req, res) => {
  try {
    const { tiers } = req.body;

    if (!Array.isArray(tiers)) {
      return res.status(400).json({ error: 'tiers باید یک آرایه باشد' });
    }

    await prisma.setting.upsert({
      where: { key: 'vip_tiers' },
      update: { value: JSON.stringify(tiers) },
      create: { key: 'vip_tiers', value: JSON.stringify(tiers) }
    });

    res.json({ message: 'سطوح VIP به‌روزرسانی شد', tiers });
  } catch (error) {
    console.error('Update VIP Tiers Error:', error);
    res.status(500).json({ error: 'خطا در به‌روزرسانی سطوح VIP' });
  }
});

// ========== مدیریت مارکتینگ و تخفیفات ==========

// GET /api/admin/discounts
router.get('/discounts', async (req, res) => {
  try {
    const { page = 1, limit = 20, is_active, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (is_active !== undefined) {
      where.is_active = is_active === 'true';
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } }
      ];
    }

    const [discounts, total] = await Promise.all([
      prisma.discount.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { created_at: 'desc' }
      }),
      prisma.discount.count({ where })
    ]);

    res.json({
      discounts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get Discounts Error:', error);
    res.status(500).json({ error: 'خطا در دریافت تخفیف‌ها' });
  }
});

// GET /api/admin/discounts/:id
router.get('/discounts/:id', async (req, res) => {
  try {
    const discount = await prisma.discount.findUnique({
      where: { id: req.params.id }
    });

    if (!discount) {
      return res.status(404).json({ error: 'تخفیف یافت نشد' });
    }

    res.json(discount);
  } catch (error) {
    console.error('Get Discount Error:', error);
    res.status(500).json({ error: 'خطا در دریافت تخفیف' });
  }
});

// POST /api/admin/discounts
router.post(
  '/discounts',
  [
    body('name').notEmpty(),
    body('code').notEmpty(),
    body('type').isIn(['percentage', 'fixed']),
    body('value').notEmpty(),
    body('start_date').isISO8601(),
    body('end_date').isISO8601()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const discount = await prisma.discount.create({
        data: {
          ...req.body,
          value: req.body.value.toString(),
          min_purchase: req.body.min_purchase?.toString() || '0',
          max_discount: req.body.max_discount?.toString()
        }
      });

      res.status(201).json(discount);
    } catch (error) {
      console.error('Create Discount Error:', error);
      res.status(500).json({ error: 'خطا در ایجاد تخفیف' });
    }
  }
);

// PUT /api/admin/discounts/:id
router.put('/discounts/:id', async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (updateData.value) updateData.value = updateData.value.toString();
    if (updateData.min_purchase) updateData.min_purchase = updateData.min_purchase.toString();
    if (updateData.max_discount) updateData.max_discount = updateData.max_discount.toString();

    const discount = await prisma.discount.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json(discount);
  } catch (error) {
    console.error('Update Discount Error:', error);
    res.status(500).json({ error: 'خطا در به‌روزرسانی تخفیف' });
  }
});

// DELETE /api/admin/discounts/:id
router.delete('/discounts/:id', async (req, res) => {
  try {
    await prisma.discount.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'تخفیف حذف شد' });
  } catch (error) {
    console.error('Delete Discount Error:', error);
    res.status(500).json({ error: 'خطا در حذف تخفیف' });
  }
});

// ========== مدیریت سئو و محتوا (Posts) ==========

// GET /api/admin/posts
router.get('/posts', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search, author_id } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;
    if (author_id) where.author_id = author_id;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { slug: { contains: search } },
        { content: { contains: search } }
      ];
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              phone: true
            }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { created_at: 'desc' }
      }),
      prisma.post.count({ where })
    ]);

    res.json({
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get Posts Error:', error);
    res.status(500).json({ error: 'خطا در دریافت مقالات' });
  }
});

// GET /api/admin/posts/:id
router.get('/posts/:id', async (req, res) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        }
      }
    });

    if (!post) {
      return res.status(404).json({ error: 'مقاله یافت نشد' });
    }

    res.json(post);
  } catch (error) {
    console.error('Get Post Error:', error);
    res.status(500).json({ error: 'خطا در دریافت مقاله' });
  }
});

// POST /api/admin/posts
router.post(
  '/posts',
  [
    body('title').notEmpty(),
    body('slug').notEmpty(),
    body('content').notEmpty(),
    body('author_id').notEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const post = await prisma.post.create({
        data: req.body,
        include: {
          author: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      res.status(201).json(post);
    } catch (error) {
      console.error('Create Post Error:', error);
      res.status(500).json({ error: 'خطا در ایجاد مقاله' });
    }
  }
);

// PUT /api/admin/posts/:id
router.put('/posts/:id', async (req, res) => {
  try {
    const post = await prisma.post.update({
      where: { id: req.params.id },
      data: req.body,
      include: {
        author: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.json(post);
  } catch (error) {
    console.error('Update Post Error:', error);
    res.status(500).json({ error: 'خطا در به‌روزرسانی مقاله' });
  }
});

// DELETE /api/admin/posts/:id
router.delete('/posts/:id', async (req, res) => {
  try {
    await prisma.post.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'مقاله حذف شد' });
  } catch (error) {
    console.error('Delete Post Error:', error);
    res.status(500).json({ error: 'خطا در حذف مقاله' });
  }
});

// ========== مدیریت رسانه و فایل‌ها ==========

// POST /api/admin/media/upload - آپلود فایل
router.post('/media/upload', uploadMedia.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'فایل الزامی است' });
    }

    const { category, alt_text } = req.body;
    const fileUrl = `/uploads/media/${req.file.filename}`;

    const mediaItem = await prisma.media.create({
      data: {
        filename: req.file.filename,
        original_name: req.file.originalname,
        mime_type: req.file.mimetype,
        size: req.file.size,
        url: fileUrl,
        category: category || 'general',
        alt_text: alt_text || null,
        created_by: req.user.id
      }
    });

    res.status(201).json(mediaItem);
  } catch (error) {
    console.error('Upload Media Error:', error);
    res.status(500).json({ error: 'خطا در آپلود فایل' });
  }
});

// GET /api/admin/media
router.get('/media', async (req, res) => {
  try {
    const { page = 1, limit = 50, category, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { filename: { contains: search } },
        { original_name: { contains: search } },
        { alt_text: { contains: search } }
      ];
    }

    const [media, total] = await Promise.all([
      prisma.media.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { created_at: 'desc' }
      }),
      prisma.media.count({ where })
    ]);

    res.json({
      media,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get Media Error:', error);
    res.status(500).json({ error: 'خطا در دریافت فایل‌ها' });
  }
});

// GET /api/admin/media/:id
router.get('/media/:id', async (req, res) => {
  try {
    const mediaItem = await prisma.media.findUnique({
      where: { id: req.params.id }
    });

    if (!mediaItem) {
      return res.status(404).json({ error: 'فایل یافت نشد' });
    }

    res.json(mediaItem);
  } catch (error) {
    console.error('Get Media Error:', error);
    res.status(500).json({ error: 'خطا در دریافت فایل' });
  }
});

// DELETE /api/admin/media/:id
router.delete('/media/:id', async (req, res) => {
  try {
    const mediaItem = await prisma.media.findUnique({
      where: { id: req.params.id }
    });

    if (!mediaItem) {
      return res.status(404).json({ error: 'فایل یافت نشد' });
    }

    // TODO: حذف فایل از storage (S3 یا local)
    // await deleteFromStorage(mediaItem.url);

    await prisma.media.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'فایل حذف شد' });
  } catch (error) {
    console.error('Delete Media Error:', error);
    res.status(500).json({ error: 'خطا در حذف فایل' });
  }
});

// POST /api/admin/test-notification - تست notification (فقط برای development)
router.post('/test-notification', async (req, res) => {
  try {
    const { type } = req.body; // 'user_reg' or 'order_new'

    if (!ioInstance) {
      return res.status(500).json({ error: 'Socket.io not initialized' });
    }

    if (type === 'user_reg') {
      // تست notification ثبت‌نام کاربر
      const testUser = await prisma.user.findFirst({
        where: { status: 'pending' },
        orderBy: { created_at: 'desc' }
      });

      if (!testUser) {
        return res.status(404).json({ error: 'No pending user found for testing' });
      }

      const notification = {
        id: Date.now().toString(),
        type: 'user_reg',
        title: 'همکار جدید: ' + (testUser.store_name || testUser.name || 'بدون نام'),
        description: `درخواست تایید هویت برای ${testUser.name || 'کاربر'} با شماره ${testUser.phone} ثبت شده است.`,
        link: `/admin/users/${testUser.id}`,
        userId: testUser.id,
        timestamp: new Date().toISOString()
      };

      const adminRoom = ioInstance.sockets.adapter.rooms.get('admin');
      const adminCount = adminRoom ? adminRoom.size : 0;
      console.log('📊 Admin room members before emit:', adminCount);
      
      ioInstance.to('admin').emit('notification', notification);
      console.log('📢 Notification emitted to admin room:', notification);
      
      res.json({ 
        message: 'Test notification sent', 
        notification,
        adminRoomMembers: adminCount
      });
    } else if (type === 'order_new') {
      // تست notification سفارش جدید
      const testOrder = await prisma.order.findFirst({
        where: { status: 'pending_payment' },
        include: { user: true },
        orderBy: { created_at: 'desc' }
      });

      if (!testOrder) {
        return res.status(404).json({ error: 'No pending order found for testing' });
      }

      const finalAmount = parseFloat(testOrder.final_amount);
      const notification = {
        id: Date.now().toString(),
        type: 'order_new',
        title: 'سفارش جدید: ' + testOrder.id,
        description: `سفارش جدید از ${testOrder.user.store_name || testOrder.user.name || 'کاربر'} به مبلغ ${finalAmount.toLocaleString('fa-IR')} تومان ثبت شد.`,
        link: `/admin/orders/${testOrder.id}`,
        orderId: testOrder.id,
        userId: testOrder.user_id,
        timestamp: new Date().toISOString()
      };

      const adminRoom = ioInstance.sockets.adapter.rooms.get('admin');
      const adminCount = adminRoom ? adminRoom.size : 0;
      console.log('📊 Admin room members before emit:', adminCount);
      
      ioInstance.to('admin').emit('notification', notification);
      console.log('📢 Notification emitted to admin room:', notification);
      
      res.json({ 
        message: 'Test notification sent', 
        notification,
        adminRoomMembers: adminCount
      });
    } else {
      return res.status(400).json({ error: 'Invalid type. Use "user_reg" or "order_new"' });
    }
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({ error: 'Error sending test notification' });
  }
});

export default router;

