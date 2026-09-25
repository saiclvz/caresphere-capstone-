import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool, sql } from './config/db.js';
import { authenticateToken, requirePermission, requireRole } from './middleware/auth.js';
import { auditLogger } from './middleware/auditLogger.js';
import { csrfProtection } from './middleware/csrf.js';
import { listChildren, getChild, createChild, updateChild, deleteChild, upsertHealthProfile } from './controllers/childController.js';
import { listInventory, lowStockAlerts, adjustInventory } from './controllers/inventoryController.js';
import { auditUnauthorizedQRScan, generateChildQR, revokeChildQR, scanChildQR, resolveQR } from './controllers/qrController.js';
import { checkInVisitor, checkOutVisitor, listVisitors, createShift, createMealDelivery, createDonation } from './controllers/operationsController.js';

dotenv.config();

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change-this-secret')) {
  throw new Error('JWT_SECRET must be configured in production');
}

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(csrfProtection);
app.use(auditLogger);

const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (fs.existsSync(clientDist)) app.use(express.static(clientDist));

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false });
const qrLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false });
app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'caresphere-api' }));

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function issueSession(pool, res, user) {
  const token = jwt.sign(user, process.env.JWT_SECRET || 'change-this-secret', { expiresIn: '8h' });
  await pool.request()
    .input('userId', sql.Int, user.userId)
    .input('tokenHash', sql.Char(64), hashToken(token))
    .input('expiresAt', sql.DateTime2, new Date(Date.now() + 8 * 60 * 60 * 1000))
    .query('INSERT INTO dbo.Sessions (UserId, TokenHash, ExpiresAt) VALUES (@userId, @tokenHash, @expiresAt)');
  res.cookie('cs_access', token, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  });
}

app.post('/api/auth/login', authLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
    const pool = await getPool();
    const result = await pool.request()
      .input('username', sql.NVarChar(80), username)
      .query(`
        SELECT u.UserId, u.FullName, u.Username, u.Email, u.PasswordHash, u.MfaEnabled, u.MfaCodeHash,
               r.RoleName
        FROM dbo.Users u
        LEFT JOIN dbo.User_Roles ur ON ur.UserId = u.UserId
        LEFT JOIN dbo.Roles r ON r.RoleId = ur.RoleId
        WHERE u.Username = @username AND u.IsActive = 1
      `);
    const account = result.recordset[0];
    if (!account || !(await bcrypt.compare(password, account.PasswordHash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const roles = [...new Set(result.recordset.map((row) => row.RoleName).filter(Boolean))];
    const user = { userId: account.UserId, name: account.FullName, username: account.Username, email: account.Email, roles, role: roles[0] };
    if (account.MfaEnabled) {
      const challengeToken = jwt.sign({ purpose: 'mfa', userId: account.UserId }, process.env.JWT_SECRET || 'change-this-secret', { expiresIn: '5m' });
      return res.json({ mfaRequired: true, challengeToken, user });
    }
    await issueSession(pool, res, user);
    req.user = user;
    return res.json({ user });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/auth/mfa/verify', authLimiter, async (req, res, next) => {
  try {
    const { challengeToken, code } = req.body;
    const challenge = jwt.verify(challengeToken || '', process.env.JWT_SECRET || 'change-this-secret');
    if (challenge.purpose !== 'mfa') return res.status(401).json({ error: 'Invalid MFA challenge' });
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, Number(challenge.userId))
      .query(`SELECT u.UserId, u.FullName, u.Username, u.Email, u.MfaCodeHash, r.RoleName
              FROM dbo.Users u LEFT JOIN dbo.User_Roles ur ON ur.UserId = u.UserId
              LEFT JOIN dbo.Roles r ON r.RoleId = ur.RoleId
              WHERE u.UserId = @userId AND u.IsActive = 1`);
    const account = result.recordset[0];
    if (!account || !account.MfaCodeHash || !(await bcrypt.compare(String(code || ''), account.MfaCodeHash))) {
      return res.status(401).json({ error: 'Invalid MFA code' });
    }
    const roles = [...new Set(result.recordset.map((row) => row.RoleName).filter(Boolean))];
    const user = { userId: account.UserId, name: account.FullName, username: account.Username, email: account.Email, roles, role: roles[0] };
    await issueSession(pool, res, user);
    req.user = user;
    return res.json({ user });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/auth/logout', authenticateToken, async (req, res, next) => {
  try {
    const pool = await getPool();
    await pool.request().input('tokenHash', sql.Char(64), hashToken(req.authToken)).query('UPDATE dbo.Sessions SET RevokedAt = SYSUTCDATETIME() WHERE TokenHash = @tokenHash');
    res.clearCookie('cs_access', { httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === 'true', path: '/' });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

app.get('/api/dashboard', authenticateToken, requirePermission('VIEW_DASHBOARD'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const [children, lowStock, donations, activity] = await Promise.all([
      pool.request().query("SELECT COUNT(*) AS total FROM dbo.Children WHERE Status = N'Active'"),
      pool.request().query('SELECT COUNT(*) AS total FROM dbo.Inventory_Items WHERE Quantity <= LowStockThreshold'),
      pool.request().query("SELECT COALESCE(SUM(Amount), 0) AS total FROM dbo.Donations WHERE ReceivedAt >= DATEADD(month, -1, SYSUTCDATETIME())"),
      pool.request().query('SELECT TOP 10 * FROM dbo.Activity_Logs ORDER BY CreatedAt DESC'),
    ]);
    return res.json({
      totalChildren: children.recordset[0].total,
      lowStockAlerts: lowStock.recordset[0].total,
      monthlyDonations: donations.recordset[0].total,
      activity: activity.recordset,
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/children', authenticateToken, requirePermission('VIEW_CHILDREN'), listChildren);
app.get('/api/children/:id', authenticateToken, requirePermission('VIEW_CHILDREN'), getChild);
app.post('/api/children', authenticateToken, requirePermission('EDIT_CHILDREN'), createChild);
app.patch('/api/children/:id', authenticateToken, requirePermission('EDIT_CHILDREN'), updateChild);
app.delete('/api/children/:id', authenticateToken, requirePermission('EDIT_CHILDREN'), deleteChild);
app.put('/api/children/:id/health', authenticateToken, requirePermission('EDIT_HEALTH_RECORD'), upsertHealthProfile);

app.post('/api/children/:childId/qr', authenticateToken, requirePermission('GENERATE_QR'), generateChildQR);
app.post('/api/children/:childId/qr/revoke', authenticateToken, requireRole('ADMIN'), revokeChildQR);
app.post('/api/qr/child/scan', authenticateToken, qrLimiter, auditUnauthorizedQRScan, requirePermission('VIEW_HEALTH_RECORD'), scanChildQR);
app.post('/api/qr/resolve', authenticateToken, qrLimiter, auditUnauthorizedQRScan, requirePermission('VIEW_HEALTH_RECORD'), resolveQR);
app.get('/api/qr/resolve', authenticateToken, qrLimiter, auditUnauthorizedQRScan, requirePermission('VIEW_HEALTH_RECORD'), resolveQR);

app.get('/api/inventory', authenticateToken, requirePermission('VIEW_INVENTORY'), listInventory);
app.get('/api/inventory/low-stock', authenticateToken, requirePermission('MANAGE_INVENTORY'), lowStockAlerts);
app.patch('/api/inventory/:id/quantity', authenticateToken, requirePermission('MANAGE_INVENTORY'), adjustInventory);

app.get('/api/activity', authenticateToken, requirePermission('VIEW_AUDIT_LOGS'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT TOP 200 * FROM dbo.Activity_Logs ORDER BY CreatedAt DESC');
    return res.json(result.recordset);
  } catch (error) {
    return next(error);
  }
});

app.get('/api/visitors', authenticateToken, requirePermission('CHECK_IN_VISITOR'), listVisitors);
app.post('/api/visitors/check-in', authenticateToken, requirePermission('CHECK_IN_VISITOR'), checkInVisitor);
app.post('/api/visitors/:id/check-out', authenticateToken, requirePermission('CHECK_IN_VISITOR'), checkOutVisitor);
app.post('/api/shifts', authenticateToken, requirePermission('MANAGE_SHIFTS'), createShift);
app.post('/api/meals', authenticateToken, requirePermission('LOG_MEALS'), createMealDelivery);
app.post('/api/donations', authenticateToken, requirePermission('MANAGE_DONATIONS'), createDonation);

if (fs.existsSync(clientDist)) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    return res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  return res.status(500).json({ error: 'Internal server error' });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`CareSphere API running on port ${port}`));
