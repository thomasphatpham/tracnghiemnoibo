import { Request } from 'express';

export function getRealClientIp(req: Request): string {
  if (!req) return '127.0.0.1';
  const xForwardedFor = req.headers ? req.headers['x-forwarded-for'] : undefined;
  if (xForwardedFor) {
    const ips = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor;
    const firstIp = ips.split(',')[0].trim();
    if (firstIp) return firstIp;
  }
  const xRealIp = req.headers ? req.headers['x-real-ip'] : undefined;
  if (xRealIp) {
    return Array.isArray(xRealIp) ? xRealIp[0].trim() : xRealIp.trim();
  }
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}
