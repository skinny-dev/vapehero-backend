import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// محاسبه تخفیف VIP
export const calculateVIPDiscount = async (userId, subtotal) => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    return { discountPercent: 0, discountAmount: 0, finalAmount: subtotal };
  }

  // دریافت تنظیمات VIP از دیتابیس
  const vipSettings = await prisma.setting.findUnique({
    where: { key: 'vip_rules' }
  });

  const defaultRules = {
    Bronze: { discount: 0, minSpent: 0 },
    Silver: { discount: 5, minSpent: 10000000 }, // 10 million Toman
    Gold: { discount: 10, minSpent: 50000000 }, // 50 million Toman
    Diamond: { discount: 15, minSpent: 100000000 } // 100 million Toman
  };

  // Parse JSON value if it's a string (SQLite stores JSON as String)
  const rulesValue = typeof vipSettings?.value === 'string' 
    ? JSON.parse(vipSettings.value) 
    : vipSettings?.value;
  const rules = rulesValue || defaultRules;
  const userRule = rules[user.vip_level] || rules.Bronze;

  const discountPercent = userRule.discount || 0;
  const discountAmount = (subtotal * discountPercent) / 100;
  const finalAmount = subtotal - discountAmount;

  return {
    discountPercent,
    discountAmount,
    finalAmount
  };
};

// به‌روزرسانی سطح VIP بر اساس total_spent
export const updateVIPLevel = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) return;

  const vipSettings = await prisma.setting.findUnique({
    where: { key: 'vip_rules' }
  });

  const defaultRules = {
    Bronze: { minSpent: 0 },
    Silver: { minSpent: 10000000 },
    Gold: { minSpent: 50000000 },
    Diamond: { minSpent: 100000000 }
  };

  // Parse JSON value if it's a string (SQLite stores JSON as String)
  const rulesValue = typeof vipSettings?.value === 'string' 
    ? JSON.parse(vipSettings.value) 
    : vipSettings?.value;
  const rules = rulesValue || defaultRules;
  const totalSpent = Number(user.total_spent);

  let newVipLevel = 'Bronze';
  if (totalSpent >= rules.Diamond.minSpent) {
    newVipLevel = 'Diamond';
  } else if (totalSpent >= rules.Gold.minSpent) {
    newVipLevel = 'Gold';
  } else if (totalSpent >= rules.Silver.minSpent) {
    newVipLevel = 'Silver';
  }

  if (newVipLevel !== user.vip_level) {
    await prisma.user.update({
      where: { id: userId },
      data: { vip_level: newVipLevel }
    });
  }
};

