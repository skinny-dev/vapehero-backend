/**
 * Fix DATABASE_URL - Runflare/other platforms sometimes add extra quotes or whitespace
 * Must run BEFORE PrismaClient is loaded
 */
const url = process.env.DATABASE_URL;
if (url) {
  const fixed = url.trim().replace(/^["']|["']$/g, '');
  if (fixed !== url) {
    process.env.DATABASE_URL = fixed;
    console.log('[Env] DATABASE_URL had extra quotes/whitespace - fixed');
  }
  if (!fixed.startsWith('postgresql://') && !fixed.startsWith('postgres://')) {
    console.error('[Env] DATABASE_URL invalid - must start with postgresql:// or postgres://');
    console.error('[Env] First 50 chars received:', JSON.stringify(url?.substring(0, 50)));
  }
} else {
  console.error('[Env] DATABASE_URL is not set');
}
