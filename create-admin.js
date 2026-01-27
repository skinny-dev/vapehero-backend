import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { phone: '09990000000' }
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      console.log('Phone: 09990000000');
      console.log('Role:', existingAdmin.role);
      console.log('Status:', existingAdmin.status);
      return;
    }

    // Create admin user
    const admin = await prisma.user.create({
      data: {
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

    console.log('✅ Admin user created successfully!');
    console.log('Phone: 09990000000');
    console.log('Name: مدیر سیستم');
    console.log('Role: admin');
    console.log('Status: active');
    console.log('\n📱 You can now login with phone: 09990000000');
  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();

