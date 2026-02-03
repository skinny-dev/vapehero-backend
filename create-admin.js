import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Usage:
//   npm run create-admin                -> creates default admin 09990000000
//   node create-admin.js 09197916676   -> creates admin with that phone
const cliPhone = process.argv[2];
const phone = cliPhone && cliPhone.trim() !== '' ? cliPhone : '09990000000';

async function createAdmin() {
  try {
    // Check if user with this phone already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { phone }
    });

    if (existingAdmin) {
      // Ensure this user has full admin (super admin) privileges
      const updated = await prisma.user.update({
        where: { phone },
        data: {
          role: 'admin',
          status: 'active',
          vip_level: 'Diamond'
        }
      });

      console.log('✅ Admin user updated (promoted to super admin)');
      console.log('Phone:', updated.phone);
      console.log('Role:', updated.role);
      console.log('Status:', updated.status);
      console.log('VIP Level:', updated.vip_level);
      return;
    }

    // Create admin user (super admin privileges via role=admin + active status)
    const admin = await prisma.user.create({
      data: {
        phone,
        name: 'مدیر سیستم',
        store_name: 'دفتر مرکزی',
        role: 'admin',
        status: 'active',
        vip_level: 'Diamond',
        total_spent: '0',
        wallet_balance: '0'
      }
    });

    console.log('✅ Admin user created successfully!');
    console.log('Phone:', admin.phone);
    console.log('Name:', admin.name);
    console.log('Role:', admin.role);
    console.log('Status:', admin.status);
    console.log('VIP Level:', admin.vip_level);
    console.log('\n📱 You can now login with phone:', admin.phone);
  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
