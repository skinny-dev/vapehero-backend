import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/products - لیست محصولات
router.get('/', async (req, res) => {
  try {
            const {
              category,
              search,
              minPrice,
              maxPrice,
              inStock,
              page = 1,
              limit = 20,
              sort = 'created_at',
              order = 'desc'
            } = req.query;

            const skip = (parseInt(page) - 1) * parseInt(limit);
            const where = {
              is_active: true // فقط محصولات فعال را نمایش بده
            };

            if (category) {
              where.category_id = category;
            }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    if (inStock !== undefined) {
      where.in_stock = inStock === 'true';
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { [sort]: order }
      }),
      prisma.product.count({ where })
    ]);

    // اگر کاربر لاگین نکرده یا وضعیت active نیست، قیمت را نمایش نده
    const token = req.headers.authorization?.replace('Bearer ', '');
    let user = null;
    
    // Development mode: Allow mock admin token
    if (process.env.NODE_ENV === 'development' && token === 'mock-admin-token') {
      user = await prisma.user.findFirst({
        where: { 
          role: 'admin',
          status: 'active'
        }
      });
    } else if (token) {
      try {
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET);
        user = await prisma.user.findUnique({
          where: { id: decoded.userId }
        });
      } catch (e) {
        // Invalid token, ignore
        console.log('Token verification failed:', e.message);
      }
    }

    const shouldShowPrice = user && user.status === 'active';
    console.log('💰 Price visibility:', { 
      hasToken: !!token, 
      hasUser: !!user, 
      userStatus: user?.status, 
      shouldShowPrice 
    });

    const productsWithPrice = products.map(product => ({
      ...product,
      price: shouldShowPrice ? product.price : null,
      // Calculate in_stock based on stock_count
      // If stock_count > 0, product is available regardless of in_stock flag
      in_stock: (product.stock_count || 0) > 0
    }));

    res.json({
      products: productsWithPrice,
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

// GET /api/products/:slug - جزئیات محصول
router.get('/:slug', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: req.params.slug },
      include: {
        category: {
          include: {
            parent: true
          }
        }
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'محصول یافت نشد' });
    }

    // بررسی دسترسی به قیمت
    const token = req.headers.authorization?.replace('Bearer ', '');
    let user = null;
    if (token) {
      try {
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET);
        user = await prisma.user.findUnique({
          where: { id: decoded.userId }
        });
      } catch (e) {
        // Invalid token
      }
    }

    const shouldShowPrice = user && user.status === 'active';

    res.json({
      ...product,
      price: shouldShowPrice ? product.price : null,
      // Calculate in_stock based on stock_count
      // If stock_count > 0, product is available regardless of in_stock flag
      in_stock: (product.stock_count || 0) > 0
    });
  } catch (error) {
    console.error('Get Product Error:', error);
    res.status(500).json({ error: 'خطا در دریافت محصول' });
  }
});

export default router;


