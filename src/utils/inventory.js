import { PrismaClient } from '@prisma/client';
import { setInventoryReservation, deleteInventoryReservation } from './redis.js';

const prisma = new PrismaClient();

// رزرو موجودی برای سفارش
export const reserveInventory = async (productId, quantity, orderId) => {
  const product = await prisma.product.findUnique({
    where: { id: productId }
  });

  if (!product) {
    throw new Error('Product not found');
  }

  // بررسی موجودی فعلی (منهای رزروهای فعال)
  const activeReservations = await prisma.inventoryReservation.findMany({
    where: {
      product_id: productId,
      expires_at: { gt: new Date() }
    }
  });

  const reservedQuantity = activeReservations.reduce(
    (sum, r) => sum + r.quantity,
    0
  );

  const availableStock = product.stock_count - reservedQuantity;

  if (availableStock < quantity) {
    throw new Error(`Insufficient stock. Available: ${availableStock}, Requested: ${quantity}`);
  }

  // ایجاد رزرو در دیتابیس
  const reservation = await prisma.inventoryReservation.create({
    data: {
      product_id: productId,
      quantity,
      order_id: orderId,
      expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
    }
  });

  // ذخیره در Redis برای دسترسی سریع
  await setInventoryReservation(productId, quantity, orderId, 7200);

  return reservation;
};

// آزاد کردن رزرو موجودی
export const releaseInventory = async (productId, orderId) => {
  await prisma.inventoryReservation.deleteMany({
    where: {
      product_id: productId,
      order_id: orderId
    }
  });

  await deleteInventoryReservation(productId, orderId);
};

// بررسی و حذف رزروهای منقضی شده
export const cleanupExpiredReservations = async () => {
  const deleted = await prisma.inventoryReservation.deleteMany({
    where: {
      expires_at: { lt: new Date() }
    }
  });

  return deleted.count;
};

// به‌روزرسانی موجودی پس از تایید پرداخت
export const updateInventoryAfterPayment = async (orderId) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { orderItems: true }
  });

  if (!order) {
    throw new Error('Order not found');
  }

  for (const item of order.orderItems) {
    // کاهش موجودی
    await prisma.product.update({
      where: { id: item.product_id },
      data: {
        stock_count: { decrement: item.quantity }
      }
    });

    // حذف رزرو
    await releaseInventory(item.product_id, orderId);
  }
};


