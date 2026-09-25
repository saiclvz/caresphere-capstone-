import { getPool, sql } from '../config/db.js';

function entityFromPath(path) {
  const match = path.match(/\/api\/([^/]+)/i);
  return match ? match[1].replace(/s$/, '') : null;
}

export function auditLogger(req, res, next) {
  res.on('finish', async () => {
    if (req.path === '/api/health') return;

    try {
      const pool = await getPool();
      const succeeded = res.statusCode >= 200 && res.statusCode < 300;
      await pool.request()
        .input('userId', sql.Int, req.user ? Number(req.user.userId || req.user.id) : null)
        .input('action', sql.NVarChar(120), `${succeeded ? '' : 'FAILED '}${req.method} ${req.originalUrl}`)
        .input('entity', sql.NVarChar(80), entityFromPath(req.originalUrl))
        .input('entityId', sql.NVarChar(80), req.params.id || null)
        .input('details', sql.NVarChar(sql.MAX), JSON.stringify({ statusCode: res.statusCode, succeeded }))
        .input('ipAddress', sql.NVarChar(64), req.ip || req.socket.remoteAddress || null)
        .query(`
          INSERT INTO dbo.Activity_Logs (UserId, Action, Entity, EntityId, Details, IPAddress)
          VALUES (@userId, @action, @entity, @entityId, @details, @ipAddress)
        `);
    } catch (error) {
      console.error('Audit log write failed:', error.message);
    }
  });
  next();
}
