console.log('[Boot] Starting server...');
import './env-fix.js'; // Fix DATABASE_URL before Prisma loads
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { getMergedCorsOrigins } from './config/corsOrigins.js';

// Import routes
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import categoryRoutes from './routes/categories.js';
import profileRoutes from './routes/profile.js';
import orderRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';
import chatRoutes from './routes/chat.js';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

// Health check FIRST - before any middleware (for platform liveness probes)
app.get('/', (req, res) => res.json({ status: 'ok', service: 'vapehero-backend' }));
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/ready', (req, res) => res.json({ status: 'ok' }));
app.get('/live', (req, res) => res.json({ status: 'ok' }));

// CORS: merge env with known production origins (see corsOrigins.js)
const allowedOrigins = getMergedCorsOrigins();

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const normalized = origin.replace(/\/$/, '');
    const match = allowedOrigins.find(
      (o) => o === origin || o.replace(/\/$/, '') === normalized,
    );
    if (match) return callback(null, origin);
    if (allowedOrigins.includes('*')) return callback(null, origin);
    // Unknown origin: reflect anyway (same as legacy) so staging / mis-set FRONTEND_URL still works
    console.warn('⚠️  CORS: origin not in merged allowlist, reflecting anyway:', origin);
    return callback(null, origin);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length'],
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting - Different limits for development and production
const isDevelopment = process.env.NODE_ENV === 'development';

// General API rate limiter (more lenient in development)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 1000 : 100, // 1000 requests in dev, 100 in production
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Never burn the rate limit on CORS preflight (OPTIONS)
  skip: (req) => req.method === 'OPTIONS',
});

// Strict rate limiter for auth endpoints (to prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 50 : 10, // 50 requests in dev, 10 in production
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
});

// Apply rate limiting
app.use('/api/auth', authLimiter); // Strict limit for auth
app.use('/api/', generalLimiter); // General limit for all other API routes

// Serve static files (uploads)
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Initialize Socket.io
import { initializeSocket } from './socket.js';
export const { io, emitNotification } = initializeSocket(server);

// Set io instance for routes
import { setIO as setAuthIO } from './routes/auth.js';
import { setIO as setOrdersIO } from './routes/orders.js';
import { setIO as setAdminIO } from './routes/admin.js';
setAuthIO(io);
setOrdersIO(io);
setAdminIO(io);

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export default app;

