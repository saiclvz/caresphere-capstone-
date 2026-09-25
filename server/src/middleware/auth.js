import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'node:crypto';
import { getPool, sql } from '../config/db.js';

dotenv.config();

const permissionsByRole = {
  ADMIN: new Set(['VIEW_DASHBOARD', 'VIEW_CHILDREN', 'EDIT_CHILDREN', 'VIEW_HEALTH_RECORD', 'ADD_HEALTH_RECORD', 'EDIT_HEALTH_RECORD', 'VIEW_MEDICAL_DOCUMENT', 'MANAGE_HEALTH_RECORD', 'GENERATE_QR', 'VIEW_AUDIT_LOGS', 'VIEW_INVENTORY', 'MANAGE_INVENTORY', 'CHECK_IN_VISITOR', 'MANAGE_SHIFTS', 'LOG_MEALS', 'MANAGE_DONATIONS']),
  STAFF: new Set(['VIEW_DASHBOARD', 'VIEW_CHILDREN', 'EDIT_CHILDREN', 'VIEW_HEALTH_RECORD', 'ADD_HEALTH_RECORD', 'GENERATE_QR', 'VIEW_INVENTORY', 'MANAGE_INVENTORY', 'CHECK_IN_VISITOR', 'LOG_MEALS']),
  HEALTH: new Set(['VIEW_DASHBOARD', 'VIEW_CHILDREN', 'VIEW_HEALTH_RECORD', 'ADD_HEALTH_RECORD', 'EDIT_HEALTH_RECORD', 'VIEW_MEDICAL_DOCUMENT', 'MANAGE_HEALTH_RECORD']),
  VIEWER: new Set(['VIEW_DASHBOARD', 'VIEW_CHILDREN', 'VIEW_HEALTH_RECORD']),
  VISITOR: new Set(['RESOLVE_QR']),
  DONOR: new Set(['RESOLVE_QR', 'MANAGE_DONATIONS']),
};

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function authenticateToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.cookies?.cs_access;

  if (!token) return res.status(401).json({ error: 'Authentication token required' });

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET || 'change-this-secret');
    const pool = await getPool();
    const session = await pool.request()
      .input('tokenHash', sql.Char(64), hashToken(token))
      .query('SELECT SessionId FROM dbo.Sessions WHERE TokenHash = @tokenHash AND RevokedAt IS NULL AND ExpiresAt > SYSUTCDATETIME()');
    if (!session.recordset[0]) return res.status(401).json({ error: 'Session revoked or expired' });
    req.user = user;
    req.authToken = token;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
}

export function requirePermission(permission) {
  return (req, res, next) => {
    const roles = Array.isArray(req.user?.roles) ? req.user.roles : [req.user?.role];
    const allowed = roles.some((role) => permissionsByRole[role]?.has(permission));
    if (!allowed) return res.status(403).json({ error: `Missing permission: ${permission}` });
    return next();
  };
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const roles = Array.isArray(req.user?.roles) ? req.user.roles : [req.user?.role];
    if (!roles.some((role) => allowedRoles.includes(role))) return res.status(403).json({ error: 'Forbidden' });
    return next();
  };
}

export { permissionsByRole };
