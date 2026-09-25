import crypto from 'node:crypto';

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);
const csrfCookie = 'cs_xsrf';

export function csrfProtection(req, res, next) {
  let token = req.cookies?.[csrfCookie];
  if (!token) {
    token = crypto.randomBytes(32).toString('hex');
    res.cookie(csrfCookie, token, {
      httpOnly: false,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/',
    });
  }

  if (safeMethods.has(req.method) || req.path === '/api/auth/login') return next();
  if (!req.headers['x-csrf-token'] || req.headers['x-csrf-token'] !== token) {
    return res.status(403).json({ error: 'CSRF token missing or invalid' });
  }
  return next();
}
