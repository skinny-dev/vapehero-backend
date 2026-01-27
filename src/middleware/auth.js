import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Development mode: Allow mock admin token
    if (process.env.NODE_ENV === 'development' && token === 'mock-admin-token') {
      const mockAdmin = await prisma.user.findFirst({
        where: { 
          role: 'admin',
          status: 'active'
        }
      });
      
      if (mockAdmin) {
        req.user = mockAdmin;
        return next();
      }
      
      // If no admin exists, create a temporary one
      const tempAdmin = await prisma.user.upsert({
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
      
      req.user = tempAdmin;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: 'Invalid or inactive user' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

export const requireAdmin = requireRole('admin');
export const requireWriter = requireRole('admin', 'writer');


