import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// تولید شناسه سفارش خوانا (مثلاً VH-1002)
export const generateOrderId = async () => {
  const prefix = 'VH';
  
  // پیدا کردن آخرین سفارش
  const lastOrder = await prisma.order.findFirst({
    orderBy: { created_at: 'desc' },
    select: { id: true }
  });

  let nextNumber = 1001;

  if (lastOrder) {
    const lastNumber = parseInt(lastOrder.id.replace(`${prefix}-`, ''));
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}-${nextNumber}`;
};


