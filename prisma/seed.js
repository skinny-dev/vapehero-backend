import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // --- Admin & Super Admin Users ---

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

  const superAdmin = await prisma.user.upsert({
    where: { phone: '09197916676' },
    update: {},
    create: {
      phone: '09197916676',
      name: 'سوپر ادمین',
      store_name: 'VapeHero HQ',
      role: 'admin',
      status: 'active',
      vip_level: 'Diamond',
      total_spent: '0',
      wallet_balance: '0'
    }
  });

  console.log('✅ Admin user:', admin.phone, '- SuperAdmin:', superAdmin.phone);

  // --- Categories (Bulk) ---

  const baseCategories = [
    {
      slug: 'vape-devices',
      name: 'دستگاه‌های ویپ',
      description: 'انواع دستگاه‌های ویپ و پاد',
      image: '/uploads/hero-caliburn.png',
      order: 1
    },
    {
      slug: 'pod-systems',
      name: 'پاد سیستم',
      description: 'پاد سیستم‌های اقتصادی و حرفه‌ای',
      image: '/uploads/hero.png',
      order: 2
    },
    {
      slug: 'e-liquids',
      name: 'مایعات الکترونیکی',
      description: 'جویس‌ها و سالت نیکوتین در طعم‌های متنوع',
      image: '/uploads/media/1767861218852-453454231.png',
      order: 3
    },
    {
      slug: 'coils-cartridges',
      name: 'کویل و کارتریج',
      description: 'کویل‌ها و کارتریج‌های سازگار با دستگاه‌های محبوب',
      image: '/uploads/media/1767632305661-980530042.jpg',
      order: 4
    }
  ];

  const categoryRecords = {};
  for (const cat of baseCategories) {
    const record = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.description,
        image: cat.image,
        order: cat.order
      },
      create: cat
    });
    categoryRecords[cat.slug] = record;
  }

  console.log('✅ Categories seeded:', Object.keys(categoryRecords).length);

  // --- Products (Bulk with placeholder images) ---

  const products = [
    {
      slug: 'vape-pod-pro',
      name: 'ویپ پاد پرو',
      description: 'دستگاه ویپ پاد حرفه‌ای با باتری قدرتمند و طراحی ارگونومیک.',
      categorySlug: 'vape-devices',
      price: 2500000,
      stock: 120,
      minOrder: 5,
      image: '/uploads/hero-caliburn.png',
      properties: {
        battery: '2000mAh',
        power: '40W',
        capacity: '2ml'
      }
    },
    {
      slug: 'vape-starter-kit',
      name: 'پک استارتر ویپ',
      description: 'پک کامل برای شروع ویپینگ؛ مناسب فروشگاه‌های تازه‌کار.',
      categorySlug: 'vape-devices',
      price: 1800000,
      stock: 80,
      minOrder: 3,
      image: '/uploads/hero.png',
      properties: {
        battery: '1500mAh',
        power: '25W',
        capacity: '2ml'
      }
    },
    {
      slug: 'salt-nic-ice-berry',
      name: 'سالت نیکوتین آیس بری ۳۰ میلی',
      description: 'طعم ترکیبی توت‌های جنگلی با حس خنکی ملایم.',
      categorySlug: 'e-liquids',
      price: 650000,
      stock: 200,
      minOrder: 10,
      image: '/uploads/media/1767622767437-65954499.png',
      properties: {
        volume: '30ml',
        nicotine: '35mg',
        vgpg: '50/50'
      }
    },
    {
      slug: 'freebase-mango-60',
      name: 'جویس مانگو ۶۰ میلی',
      description: 'طعم شیرین و طبیعی انبه برای طرفداران میوه‌ای.',
      categorySlug: 'e-liquids',
      price: 720000,
      stock: 150,
      minOrder: 6,
      image: '/uploads/media/1767622772056-252266573.jpg',
      properties: {
        volume: '60ml',
        nicotine: '3mg',
        vgpg: '70/30'
      }
    },
    {
      slug: 'mesh-coil-0-8',
      name: 'کویل مش ۰.۸ اهم',
      description: 'کویل مش با طعم‌دهی بالا، مناسب برای پاد سیستم‌ها.',
      categorySlug: 'coils-cartridges',
      price: 180000,
      stock: 500,
      minOrder: 20,
      image: '/uploads/media/1767632305661-980530042.jpg',
      properties: {
        resistance: '0.8Ω',
        material: 'Kanthal',
        pack: '5 pcs'
      }
    }
  ];

  for (const p of products) {
    const category = categoryRecords[p.categorySlug];
    if (!category) continue;

    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        category_id: category.id,
        stock_count: p.stock,
        min_order: p.minOrder,
        in_stock: p.stock > 0,
        price: p.price.toString(),
        image_main: p.image,
        properties: JSON.stringify(p.properties),
        colors: JSON.stringify([])
      }
    });
  }

  console.log('✅ Products seeded:', products.length);

  // --- VIP Settings (Marketing Rules) ---

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

  // --- Marketing Offers (Discount Codes) ---

  const discounts = [
    {
      code: 'WELCOME10',
      name: 'تخفیف خوش‌آمدگویی',
      type: 'percentage',
      value: '10',
      min_purchase: '5000000',
      max_discount: '500000',
      description: '۱۰٪ تخفیف برای اولین سفارش همکاران جدید',
      days: 60
    },
    [
      'VIP20',
      'تخفیف ویژه همکاران طلایی',
      'percentage',
      '20',
      '20000000',
      '5000000',
      '۲۰٪ تخفیف برای همکاران سطح Gold و بالاتر',
      90
    ],
    {
      code: 'CLEARANCE30',
      name: 'حراج پایان فصل',
      type: 'percentage',
      value: '30',
      min_purchase: '0',
      max_discount: null,
      description: 'تخفیف ویژه روی کالاهای حراجی محدود',
      days: 30
    }
  ].map((d) =>
    Array.isArray(d)
      ? {
          code: d[0],
          name: d[1],
          type: d[2],
          value: d[3],
          min_purchase: d[4],
          max_discount: d[5],
          description: d[6],
          days: d[7]
        }
      : d
  );

  const now = new Date();
  for (const d of discounts) {
    await prisma.discount.upsert({
      where: { code: d.code },
      update: {},
      create: {
        name: d.name,
        code: d.code,
        type: d.type,
        value: d.value,
        min_purchase: d.min_purchase,
        max_discount: d.max_discount,
        start_date: now,
        end_date: new Date(now.getTime() + d.days * 24 * 60 * 60 * 1000),
        is_active: true,
        description: d.description
      }
    });
  }

  console.log('✅ Discounts seeded:', discounts.length);

  // --- SEO & Content (Blog Posts) ---

  const posts = [
    {
      slug: 'wholesale-vape-buying-guide',
      title: 'راهنمای خرید عمده ویپ برای فروشگاه‌ها',
      focus_keyword: 'خرید عمده ویپ',
      meta_description:
        'در این مقاله تمام نکات مهم برای خرید عمده ویپ و پاد سیستم برای فروشگاه‌های دخانیات و ویپ شاپ‌ها را بررسی می‌کنیم.',
      content: `
        <h2>چرا خرید عمده ویپ از ویپ هیرو؟</h2>
        <p>ما به عنوان پخش‌کننده تخصصی ویپ و جویس، بهترین قیمت‌ها و خدمات را برای همکاران فراهم کرده‌ایم.</p>
        <ul>
          <li>تنوع بالای محصولات</li>
          <li>ارسال سریع به سراسر کشور</li>
          <li>ضمانت ۱۰۰٪ اصالت کالا</li>
        </ul>
      `
    },
    {
      slug: 'salt-vs-freebase',
      title: 'تفاوت سالت نیکوتین و جویس معمولی چیست؟',
      focus_keyword: 'تفاوت سالت و جویس',
      meta_description:
        'آیا نمی‌دانید برای مشتریان فروشگاه خود سالت نیکوتین بهتر است یا جویس معمولی؟ در این مقاله تفاوت‌ها را بررسی می‌کنیم.',
      content: `
        <h2>سالت نیکوتین</h2>
        <p>برای افرادی که به دنبال حس نزدیک به سیگار هستند و نیکوتین بالاتر می‌خواهند، سالت نیکوتین بهترین گزینه است.</p>
        <h2>جویس معمولی (Freebase)</h2>
        <p>مناسب برای ابر بخار بیشتر و استفاده در دستگاه‌های پر قدرت.</p>
      `
    }
  ];

  for (const post of posts) {
    await prisma.post.upsert({
      where: { slug: post.slug },
      update: {},
      create: {
        title: post.title,
        slug: post.slug,
        content: post.content,
        author_id: superAdmin.id,
        meta_description: post.meta_description,
        focus_keyword: post.focus_keyword,
        seo_score: 85,
        status: 'published'
      }
    });
  }

  console.log('✅ Posts seeded:', posts.length);

  // --- Register SVG placeholder in media library (so it appears in AdminMedia) ---

  const existingPlaceholder = await prisma.media.findFirst({
    where: { url: '/uploads/placeholder.svg' }
  });

  if (!existingPlaceholder) {
    await prisma.media.create({
      data: {
        filename: 'placeholder.svg',
        original_name: 'placeholder.svg',
        mime_type: 'image/svg+xml',
        size: 0,
        url: '/uploads/placeholder.svg',
        category: 'general',
        alt_text: 'تصویر پیش‌فرض ویپ هیرو',
        created_by: admin.id
      }
    });
    console.log('✅ SVG placeholder registered in media library');
  }

  console.log('🎉 All seed data has been created successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

