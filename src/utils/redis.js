import { createClient } from 'redis';

let redisClient = null;
let useMemoryStore = false;

// In-memory store as fallback when Redis is not available
const memoryStore = new Map();

// Cleanup expired entries from memory store every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of memoryStore.entries()) {
    if (value.expiresAt && value.expiresAt < now) {
      memoryStore.delete(key);
    }
  }
}, 60000); // Run every minute

export const getRedisClient = async () => {
  if (useMemoryStore) {
    // Return memory-based mock client
    return {
      get: async (key) => {
        const item = memoryStore.get(key);
        if (!item) return null;
        if (item.expiresAt && item.expiresAt < Date.now()) {
          memoryStore.delete(key);
          return null;
        }
        return item.value;
      },
      set: async (key, value, options) => {
        const expiresAt = options?.EX ? Date.now() + (options.EX * 1000) : null;
        memoryStore.set(key, { value, expiresAt });
        return 'OK';
      },
      del: async (key) => {
        memoryStore.delete(key);
        return 1;
      },
      exists: async (key) => {
        return memoryStore.has(key) ? 1 : 0;
      },
      expire: async (key, seconds) => {
        const item = memoryStore.get(key);
        if (item) {
          item.expiresAt = Date.now() + (seconds * 1000);
          return 1;
        }
        return 0;
      },
    };
  }

  if (redisClient) {
    return redisClient;
  }

  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: false, // Don't auto-reconnect, fail fast
      }
    });

    // Suppress error logging after first error
    let errorLogged = false;
    redisClient.on('error', (err) => {
      if (!errorLogged && !useMemoryStore) {
        console.warn('⚠️  Redis connection error, switching to in-memory store');
        console.warn('   This is OK for development. For production, install and run Redis.');
        useMemoryStore = true;
        errorLogged = true;
        // Close the client to stop retry attempts
        if (redisClient) {
          redisClient.removeAllListeners();
          redisClient.quit().catch(() => {});
          redisClient = null;
        }
      }
    });
    
    await redisClient.connect();
    console.log('✅ Connected to Redis');
    
    return redisClient;
  } catch (error) {
    if (!useMemoryStore) {
      console.warn('⚠️  Redis not available, using in-memory store for OTP and inventory reservations');
      console.warn('   This is OK for development. For production, install and run Redis.');
      console.warn('   Note: In-memory store is not persistent across server restarts');
      useMemoryStore = true;
    }
    
    // Return memory-based mock client
    return {
      get: async (key) => {
        const item = memoryStore.get(key);
        if (!item) return null;
        if (item.expiresAt && item.expiresAt < Date.now()) {
          memoryStore.delete(key);
          return null;
        }
        return item.value;
      },
      set: async (key, value, options) => {
        const expiresAt = options?.EX ? Date.now() + (options.EX * 1000) : null;
        memoryStore.set(key, { value, expiresAt });
        return 'OK';
      },
      del: async (key) => {
        memoryStore.delete(key);
        return 1;
      },
      exists: async (key) => {
        return memoryStore.has(key) ? 1 : 0;
      },
      expire: async (key, seconds) => {
        const item = memoryStore.get(key);
        if (item) {
          item.expiresAt = Date.now() + (seconds * 1000);
          return 1;
        }
        return 0;
      },
    };
  }
};

export const setOTP = async (phone, code) => {
  const client = await getRedisClient();
  const key = `otp:${phone}`;
  await client.set(key, code, { EX: 300 }); // 5 minutes expiry
};

export const getOTP = async (phone) => {
  const client = await getRedisClient();
  const key = `otp:${phone}`;
  return await client.get(key);
};

export const deleteOTP = async (phone) => {
  const client = await getRedisClient();
  const key = `otp:${phone}`;
  await client.del(key);
};

export const setInventoryReservation = async (productId, quantity, orderId, ttl = 7200) => {
  const client = await getRedisClient();
  const key = `inventory:reserve:${productId}:${orderId}`;
  await client.set(key, quantity.toString(), { EX: ttl }); // 2 hours default
};

export const getInventoryReservation = async (productId, orderId) => {
  const client = await getRedisClient();
  const key = `inventory:reserve:${productId}:${orderId}`;
  const value = await client.get(key);
  return value ? parseInt(value) : null;
};

export const deleteInventoryReservation = async (productId, orderId) => {
  const client = await getRedisClient();
  const key = `inventory:reserve:${productId}:${orderId}`;
  await client.del(key);
};


