import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/profile - اطلاعات کاربر و سطح VIP
router.get('/', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        phone: true,
        name: true,
        store_name: true,
        role: true,
        status: true,
        vip_level: true,
        total_spent: true,
        wallet_balance: true,
        created_at: true
      }
    });

    res.json(user);
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).json({ error: 'خطا در دریافت اطلاعات' });
  }
});

// PATCH /api/profile - به‌روزرسانی اطلاعات پروفایل کاربر
router.patch('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, store_name } = req.body;

    const data = {};

    if (typeof name === 'string' && name.trim().length > 0) {
      data.name = name.trim();
    }

    if (typeof store_name === 'string' && store_name.trim().length > 0) {
      data.store_name = store_name.trim();
    }

    if (Object.keys(data).length === 0) {
      return res
        .status(400)
        .json({ error: 'هیچ فیلدی برای به‌روزرسانی ارسال نشده است.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        phone: true,
        name: true,
        store_name: true,
        role: true,
        status: true,
        vip_level: true,
        total_spent: true,
        wallet_balance: true,
        created_at: true
      }
    });

    return res.json(updatedUser);
  } catch (error) {
    console.error('Update Profile Error:', error);
    return res
      .status(500)
      .json({ error: 'خطا در به‌روزرسانی پروفایل کاربر' });
  }
});

// GET /api/profile/orders - لیست سفارشات کاربر
router.get('/orders', authenticate, async (req, res) => {
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
                  image_main: true
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

export default router;


