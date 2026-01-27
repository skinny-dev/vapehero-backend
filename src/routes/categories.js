import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/vip-tiers - دریافت عمومی سطوح VIP (بدون نیاز به authentication)
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

// GET /api/categories - لیست درختی دسته‌بندی‌ها
router.get('/', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        children: {
          orderBy: { order: 'asc' }
        },
        _count: {
          select: { products: true }
        }
      },
      where: {
        parent_id: null // فقط دسته‌های اصلی
      },
      orderBy: { order: 'asc' }
    });

    res.json(categories);
  } catch (error) {
    console.error('Get Categories Error:', error);
    res.status(500).json({ error: 'خطا در دریافت دسته‌بندی‌ها' });
  }
});

// GET /api/categories/vip-tiers - دریافت عمومی سطوح VIP (بدون نیاز به authentication)
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

// GET /api/categories/:slug - جزئیات یک دسته‌بندی
router.get('/:slug', async (req, res) => {
  try {
    const category = await prisma.category.findUnique({
      where: { slug: req.params.slug },
      include: {
        parent: true,
        children: {
          orderBy: { order: 'asc' }
        },
        products: {
          take: 10,
          orderBy: { created_at: 'desc' }
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

export default router;


