/**
 * Browser origins allowed for CORS / Socket.io.
 * Merges FRONTEND_URL with known production hosts so Runflare + vapehero.net work
 * even when platform env is incomplete.
 */
export function getMergedCorsOrigins() {
  const envOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((u) => u.trim()).filter(Boolean)
    : [];
  const defaultOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://vapehero.net',
    'http://vapehero.net',
    'https://www.vapehero.net',
    'http://www.vapehero.net',
    'https://vapehero.runflare.run',
    'http://vapehero.runflare.run',
  ];
  return [...new Set([...defaultOrigins, ...envOrigins])];
}
