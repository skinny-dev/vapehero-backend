import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ایجاد کاربر Admin
  const admin = await prisma.user.upsert({
    where: { phone: '09990000000' },
    update: {},
    create: {
      phone: '09990000000',
      name: 'مدیر سیستم',
      store_name: 'دفتر مرکزی',
      role: 'admin',
      status: 'active',
      vip_level: 'Diamond',
      total_spent: '0',
      wallet_balance: '0'
    }
  });
  console.log('✅ Admin user created:', admin.phone);

  // ایجاد دسته‌بندی‌های نمونه
  const category1 = await prisma.category.upsert({
    where: { slug: 'vape-devices' },
    update: {},
    create: {
      name: 'دستگاه‌های ویپ',
      slug: 'vape-devices',
      description: 'انواع دستگاه‌های ویپ و پاد'
    }
  });

  const category2 = await prisma.category.upsert({
    where: { slug: 'e-liquids' },
    update: {},
    create: {
      name: 'مایعات الکترونیکی',
      slug: 'e-liquids',
      description: 'انواع مایعات و طعم‌های مختلف'
    }
  });

  // ایجاد محصولات نمونه
  await prisma.product.upsert({
    where: { slug: 'vape-pod-pro' },
    update: {},
    create: {
      name: 'ویپ پاد پرو',
      slug: 'vape-pod-pro',
      description: 'دستگاه ویپ پاد حرفه‌ای با باتری قدرتمند',
      category_id: category1.id,
      stock_count: 100,
      min_order: 5,
      in_stock: true,
      price: '2500000', // String for SQLite
      properties: JSON.stringify({
        battery: '2000mAh',
        power: '40W',
        capacity: '2ml'
      }),
      colors: JSON.stringify([
        {
          name: 'مشکی',
          code: '#000000',
          images: ['/images/vape-pod-pro-black-1.jpg']
        },
        {
          name: 'سفید',
          code: '#FFFFFF',
          images: ['/images/vape-pod-pro-white-1.jpg']
        }
      ])
    }
  });

  // ایجاد تنظیمات پیش‌فرض VIP
  await prisma.setting.upsert({
    where: { key: 'vip_rules' },
    update: {},
    create: {
      key: 'vip_rules',
      value: JSON.stringify({
        Bronze: { discount: 0, minSpent: 0 },
        Silver: { discount: 5, minSpent: 10000000 },
        Gold: { discount: 10, minSpent: 50000000 },
        Diamond: { discount: 15, minSpent: 100000000 }
      })
    }
  });

  // ایجاد کاربر ادمین نمونه (برای تست)
  await prisma.user.upsert({
    where: { phone: '09123456789' },
    update: {},
    create: {
      phone: '09123456789',
      name: 'مدیر سیستم',
      store_name: 'VapeHero Admin',
      role: 'admin',
      status: 'active',
      vip_level: 'Diamond'
    }
  });

  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

