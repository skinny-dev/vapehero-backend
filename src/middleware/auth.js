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
    if (
      process.env.NODE_ENV === 'development' &&
      token === 'mock-admin-token'
    ) {
      const mockAdmin = await prisma.user.findFirst({
        where: {
          role: { in: ['admin', 'super_admin'] },
          status: 'active'
        }
      });

      if (mockAdmin) {
        req.user = mockAdmin;
        return next();
      }

      // If no admin exists, create a temporary super admin
      const tempAdmin = await prisma.user.upsert({
        where: { phone: '09990000000' },
        update: {
          role: 'super_admin',
          status: 'active'
        },
        create: {
          phone: '09990000000',
          name: 'مدیر سیستم',
          store_name: 'دفتر مرکزی',
          role: 'super_admin',
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

    if (!user) {
      return res.status(401).json({ error: 'Invalid or inactive user' });
    }

    // Admin roles can always authenticate (even if status is pending)
    const adminRoles = ['super_admin', 'admin', 'manager'];
    if (!adminRoles.includes(user.role) && user.status !== 'active') {
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

    // super_admin همیشه مجوز دارد
    if (req.user.role === 'super_admin') {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient role permissions' });
    }

    next();
  };
};

// Permission-based access control
export const requirePermission = (...permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // super_admin has all permissions
      if (req.user.role === 'super_admin') {
        return next();
      }

      const userPermissions = await prisma.userPermission.findMany({
        where: { user_id: req.user.id },
        include: { permission: true }
      });

      const permissionKeys = new Set(
        userPermissions.map((up) => up.permission.key)
      );

      const hasPermission = permissions.some((p) => permissionKeys.has(p));

      if (!hasPermission) {
        return res
          .status(403)
          .json({ error: 'Insufficient action permissions' });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error.message);
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

export const requireAdmin = requireRole('super_admin', 'admin', 'manager');
export const requireWriter = requireRole('admin', 'writer', 'manager');


