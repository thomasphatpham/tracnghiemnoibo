import { getRealClientIp } from './ip.util';
import { Request } from 'express';

describe('getRealClientIp', () => {
  it('should return 127.0.0.1 if req is null or undefined', () => {
    expect(getRealClientIp(null as any)).toBe('127.0.0.1');
    expect(getRealClientIp(undefined as any)).toBe('127.0.0.1');
  });

  it('should return 127.0.0.1 if no headers, ip or socket are present', () => {
    const mockReq = {} as Request;
    expect(getRealClientIp(mockReq)).toBe('127.0.0.1');
  });

  it('should extract first IP from single x-forwarded-for header', () => {
    const mockReq = {
      headers: {
        'x-forwarded-for': '203.0.113.195',
      },
    } as unknown as Request;

    expect(getRealClientIp(mockReq)).toBe('203.0.113.195');
  });

  it('should extract and trim the first IP from comma-separated x-forwarded-for', () => {
    const mockReq = {
      headers: {
        'x-forwarded-for': '  203.0.113.195 , 70.41.3.18, 150.172.238.178 ',
      },
    } as unknown as Request;

    expect(getRealClientIp(mockReq)).toBe('203.0.113.195');
  });

  it('should handle x-forwarded-for when passed as an array', () => {
    const mockReq = {
      headers: {
        'x-forwarded-for': ['203.0.113.195, 70.41.3.18', '192.168.1.1'],
      },
    } as unknown as Request;

    expect(getRealClientIp(mockReq)).toBe('203.0.113.195');
  });

  it('should extract IP from x-real-ip when x-forwarded-for is missing', () => {
    const mockReq = {
      headers: {
        'x-real-ip': '  198.51.100.42  ',
      },
    } as unknown as Request;

    expect(getRealClientIp(mockReq)).toBe('198.51.100.42');
  });

  it('should handle x-real-ip when passed as an array', () => {
    const mockReq = {
      headers: {
        'x-real-ip': ['198.51.100.42'],
      },
    } as unknown as Request;

    expect(getRealClientIp(mockReq)).toBe('198.51.100.42');
  });

  it('should prefer x-forwarded-for over x-real-ip and req.ip', () => {
    const mockReq = {
      headers: {
        'x-forwarded-for': '203.0.113.195, 70.41.3.18',
        'x-real-ip': '198.51.100.42',
      },
      ip: '10.0.0.1',
    } as unknown as Request;

    expect(getRealClientIp(mockReq)).toBe('203.0.113.195');
  });

  it('should prefer x-real-ip over req.ip when x-forwarded-for is absent', () => {
    const mockReq = {
      headers: {
        'x-real-ip': '198.51.100.42',
      },
      ip: '10.0.0.1',
    } as unknown as Request;

    expect(getRealClientIp(mockReq)).toBe('198.51.100.42');
  });

  it('should fall back to req.ip when headers are absent', () => {
    const mockReq = {
      headers: {},
      ip: '172.16.254.1',
    } as unknown as Request;

    expect(getRealClientIp(mockReq)).toBe('172.16.254.1');
  });

  it('should fall back to req.socket.remoteAddress when req.ip is absent', () => {
    const mockReq = {
      headers: {},
      socket: {
        remoteAddress: '10.10.10.10',
      },
    } as unknown as Request;

    expect(getRealClientIp(mockReq)).toBe('10.10.10.10');
  });
});
