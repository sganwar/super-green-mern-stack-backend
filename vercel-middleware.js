// middleware.js
import { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize the rate limiter: 5 requests per 60 seconds per IP
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '60 s'),
  analytics: true,
});

export default async function middleware(request) {
  // Apply rate limiting only to the coupon endpoint
  if (request.nextUrl.pathname.startsWith('/api/coupon/')) {

    // 1. Try to get the IP from the standard Vercel header first
    let ip = request.headers.get('x-real-ip');

    // 2. If that's not found, try the common 'x-forwarded-for' header
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (!ip && forwardedFor) {
      ip = forwardedFor.split(',')[0].trim();
    }

    // 3. CRITICAL: If we still cannot determine the IP, SKIP RATE LIMITING.
    if (!ip) {
      console.warn('⚠️  Could not determine IP address for request. Skipping rate limit.');
      return NextResponse.next();
    }

    // 4. Apply the rate limit only if we have a valid IP
    const { success, limit, reset, remaining } = await ratelimit.limit(ip);

    if (!success) {
      return new NextResponse('Too many requests. Please try again in a minute.', { status: 429 });
    }

    // If successful, add rate limit headers to the response
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', reset.toString());
    return response;
  }

  // For all other routes (including /api/webhook), just pass them through
  return NextResponse.next();
}

// Configure this middleware to run on all routes that start with /api
export const config = {
  matcher: '/api/:path*',
};