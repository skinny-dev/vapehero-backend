import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/chat - چت با هوش مصنوعی
router.post('/', authenticate, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'پیام الزامی است' });
    }

    // دریافت لیست محصولات برای context
    const products = await prisma.product.findMany({
      take: 50,
      select: {
        name: true,
        description: true,
        price: true,
        in_stock: true,
        category: {
          select: {
            name: true
          }
        }
      }
    });

    const productsContext = products.map(p => 
      `- ${p.name} (${p.category.name}): ${p.description || 'بدون توضیحات'} - موجود: ${p.in_stock ? 'بله' : 'خیر'}`
    ).join('\n');

    const systemPrompt = `شما دستیار فروشگاه عمده‌فروشی VapeHero هستید. 
به سوالات مشتریان درباره محصولات پاسخ دهید.

محصولات موجود:
${productsContext}

لطفا پاسخ‌های خود را به فارسی و به صورت دوستانه و حرفه‌ای ارائه دهید.
اگر سوالی درباره محصول خاصی پرسیده شد، اطلاعات دقیق آن را ارائه دهید.`;

    // استفاده از Gemini API
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const result = await model.generateContent(systemPrompt + '\n\nسوال کاربر: ' + message);
    const response = await result.response;
    const text = response.text();

    res.json({
      response: text
    });
  } catch (error) {
    console.error('Chat Error:', error);
    res.status(500).json({ error: 'خطا در ارتباط با هوش مصنوعی' });
  }
});

export default router;


