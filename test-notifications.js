/**
 * Script تست برای Notification ها
 * 
 * استفاده:
 *   node test-notifications.js user      - تست notification ثبت‌نام کاربر
 *   node test-notifications.js order     - تست notification سفارش جدید
 *   node test-notifications.js all       - تست همه notification ها
 * 
 * نکته: این script از API endpoint استفاده می‌کند، پس backend باید در حال اجرا باشد
 */

import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Helper function to get admin token
async function getAdminToken() {
  const admin = await prisma.user.findFirst({
    where: { role: 'admin', status: 'active' }
  });

  if (!admin) {
    console.error('❌ Admin user not found. Please create an admin user first.');
    process.exit(1);
  }

  return jwt.sign(
    { userId: admin.id, phone: admin.phone },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// Send notification via API endpoint (uses the same Socket.io instance as the server)
async function sendNotificationViaAPI(type) {
  const admin = await prisma.user.findFirst({
    where: { role: 'admin', status: 'active' }
  });

  if (!admin) {
    console.error('❌ Admin user not found');
    return;
  }

  const token = jwt.sign(
    { userId: admin.id, phone: admin.phone },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  try {
    const response = await fetch('http://localhost:3001/api/admin/test-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ type })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Notification sent via API:', data.message);
      if (data.notification) {
        console.log('📢 Notification details:', data.notification);
      }
    } else {
      const error = await response.json();
      console.error('❌ API Error:', error);
    }
  } catch (error) {
    console.error('❌ Failed to send notification via API:', error.message);
    console.log('💡 Make sure the backend server is running on port 3001');
    throw error;
  }
}

// تست notification ثبت‌نام کاربر
async function testUserRegistration() {
  console.log('\n🧪 Testing User Registration Notification...\n');

  try {
    // ایجاد یک کاربر تست
    const testPhone = `0912${Math.floor(Math.random() * 10000000)}`;
    const testUser = await prisma.user.create({
      data: {
        phone: testPhone,
        name: 'کاربر تست',
        store_name: 'فروشگاه تست',
        status: 'pending',
        role: 'user',
        vip_level: 'Bronze',
        total_spent: '0',
        wallet_balance: '0'
      }
    });

    console.log('✅ Test user created:', testUser.id, testUser.phone);

    // Send notification via API (uses the same Socket.io instance as the server)
    console.log('📢 Sending notification via API...');
    await sendNotificationViaAPI('user_reg');
    console.log('💡 Note: Make sure your admin panel is open and connected to see the notification!\n');

    // Cleanup (optional - comment out if you want to keep test users)
    // await prisma.user.delete({ where: { id: testUser.id } });
    // console.log('🧹 Test user cleaned up');

  } catch (error) {
    console.error('❌ Error testing user registration:', error);
  }
}

// تست notification سفارش جدید
async function testNewOrder() {
  console.log('\n🧪 Testing New Order Notification...\n');

  try {
    // پیدا کردن یک کاربر فعال
    const user = await prisma.user.findFirst({
      where: { status: 'active' },
      include: { orders: { take: 1 } }
    });

    if (!user) {
      console.error('❌ No active user found. Please create an active user first.');
      return;
    }

    // پیدا کردن یک محصول
    const product = await prisma.product.findFirst({
      where: { is_active: true, in_stock: true }
    });

    if (!product) {
      console.error('❌ No active product found. Please create a product first.');
      return;
    }

    // ایجاد سفارش تست
    const orderId = `VH-TEST-${Date.now()}`;
    const subtotal = parseFloat(product.price) * 5;
    const finalAmount = subtotal;

    const order = await prisma.order.create({
      data: {
        id: orderId,
        user_id: user.id,
        status: 'pending_payment',
        total_amount: subtotal.toString(),
        discount_amount: '0',
        final_amount: finalAmount.toString(),
        items: JSON.stringify([{
          product_id: product.id,
          quantity: 5,
          price: product.price
        }]),
        shipping_address: 'آدرس تست',
        orderItems: {
          create: {
            product_id: product.id,
            quantity: 5,
            price: product.price
          }
        }
      }
    });

    console.log('✅ Test order created:', order.id);

    // Send notification via API (uses the same Socket.io instance as the server)
    console.log('📢 Sending notification via API...');
    await sendNotificationViaAPI('order_new');
    console.log('💡 Note: Make sure your admin panel is open and connected to see the notification!\n');

    // Cleanup (optional)
    // await prisma.order.delete({ where: { id: order.id } });
    // console.log('🧹 Test order cleaned up');

  } catch (error) {
    console.error('❌ Error testing new order:', error);
  }
}

// تست همه notification ها
async function testAll() {
  console.log('\n🧪 Testing All Notifications...\n');
  await testUserRegistration();
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
  await testNewOrder();
}

// Main
const command = process.argv[2] || 'all';

(async () => {
  try {
    console.log('🚀 Starting notification tests...\n');
    console.log('💡 Using API endpoint to send notifications (requires server to be running)\n');

    switch (command) {
      case 'user':
        await testUserRegistration();
        break;
      case 'order':
        await testNewOrder();
        break;
      case 'all':
        await testAll();
        break;
      default:
        console.log('Usage:');
        console.log('  node test-notifications.js user   - Test user registration notification');
        console.log('  node test-notifications.js order  - Test new order notification');
        console.log('  node test-notifications.js all    - Test all notifications');
        process.exit(1);
    }

    console.log('✅ Tests completed!\n');
    console.log('💡 Make sure your admin panel is open to see the notifications!\n');
    
    // Wait a bit before exiting to ensure notifications are sent
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
