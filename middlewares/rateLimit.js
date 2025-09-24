const { Ratelimit } = require('@upstash/ratelimit');
const { Redis } = require('@upstash/redis');

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '60 s'), 
  analytics: true,
});

const couponRateLimit = async (req, res, next) => {
  // Apply only to coupon routes
  if (req.path.startsWith('/api/coupon')) {
    try {
      const ip = req.ip || req.connection.remoteAddress;
      
      if (!ip) {
        console.warn('⚠️ Could not determine IP address');
        return next();
      }

      const { success, limit, reset, remaining } = await ratelimit.limit(ip);

      if (!success) {
        return res.status(429).json({
          error: 'Too many requests. Please try again in a minute.'
        });
      }

      // Add rate limit headers
      res.set('X-RateLimit-Limit', limit.toString());
      res.set('X-RateLimit-Remaining', remaining.toString());
      res.set('X-RateLimit-Reset', reset.toString());
    } catch (error) {
      console.error('Rate limit error:', error);
      // Allow the request to proceed if rate limiting fails
    }
  }
  
  next();
};

module.exports = couponRateLimit;