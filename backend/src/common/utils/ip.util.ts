import { Request } from 'express';

export function getRealClientIp(req: Request): string {
  if (!req) return '127.0.0.1';
  let ip = '';
  const xForwardedFor = req.headers ? req.headers['x-forwarded-for'] : undefined;
  if (xForwardedFor) {
    const ips = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor;
    const firstIp = ips.split(',')[0].trim();
    if (firstIp) ip = firstIp;
  }
  if (!ip) {
    const xRealIp = req.headers ? req.headers['x-real-ip'] : undefined;
    if (xRealIp) {
      ip = Array.isArray(xRealIp) ? xRealIp[0].trim() : xRealIp.trim();
    }
  }
  if (!ip) {
    ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';
  }
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }
  if (ip === '::1') {
    ip = '127.0.0.1';
  }
  return ip;
}

