import crypto from 'node:crypto';
import QRCode from 'qrcode';
import { getPool, sql } from '../config/db.js';

const QR_TTL_MINUTES = 3;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function recordScanAttempt(pool, req, result, childId) {
  await pool.request()
    .input('userId', sql.Int, Number(req.user?.userId) || null)
    .input('action', sql.NVarChar(120), 'CHILD_HEALTH_QR_SCAN')
    .input('entity', sql.NVarChar(80), 'child_health')
    .input('entityId', sql.NVarChar(80), childId ? String(childId) : null)
    .input('details', sql.NVarChar(sql.MAX), JSON.stringify({ result, tokenReference: 'sha256' }))
    .input('ipAddress', sql.NVarChar(64), req.ip || req.socket.remoteAddress || null)
    .query(`INSERT INTO dbo.Activity_Logs (UserId, Action, Entity, EntityId, Details, IPAddress)
            VALUES (@userId, @action, @entity, @entityId, @details, @ipAddress)`);
}

export async function auditUnauthorizedQRScan(req, res, next) {
  const roles = Array.isArray(req.user?.roles) ? req.user.roles : [req.user?.role];
  const allowed = roles.some((role) => ['ADMIN', 'STAFF', 'HEALTH'].includes(role));
  if (allowed) return next();

  try {
    const pool = await getPool();
    await recordScanAttempt(pool, req, 'UNAUTHORIZED', null);
  } catch (error) {
    console.error('Unauthorized QR audit failed:', error.message);
  }
  return res.status(403).json({ error: 'QR Code Invalid or Unauthorized' });
}

export async function generateChildQR(req, res, next) {
  try {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + QR_TTL_MINUTES * 60 * 1000);
    const pool = await getPool();
    const childId = Number(req.params.childId);

    const child = await pool.request()
      .input('childId', sql.Int, childId)
      .query('SELECT ChildId, ChildCode, FirstName, LastName FROM dbo.Children WHERE ChildId = @childId');
    if (!child.recordset[0]) return res.status(404).json({ error: 'Child not found' });

    await pool.request()
      .input('childId', sql.Int, childId)
      .input('tokenHash', sql.Char(64), hashToken(token))
      .input('expiresAt', sql.DateTime2, expiresAt)
      .input('createdBy', sql.Int, Number(req.user.userId))
      .query(`
        INSERT INTO dbo.QR_Tokens (ChildId, TokenHash, ExpiresAt, CreatedBy)
        VALUES (@childId, @tokenHash, @expiresAt, @createdBy)
      `);

    const resolverUrl = `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/qr/resolve?token=${encodeURIComponent(token)}`;
    const dataUrl = await QRCode.toDataURL(resolverUrl, { margin: 1, width: 300 });
    return res.status(201).json({ dataUrl, token, expiresAt: expiresAt.toISOString() });
  } catch (error) {
    return next(error);
  }
}

export async function revokeChildQR(req, res, next) {
  try {
    const pool = await getPool();
    const result = await pool.request().input('childId', sql.Int, Number(req.params.childId))
      .query('UPDATE dbo.QR_Tokens SET RevokedAt = SYSUTCDATETIME() WHERE ChildId = @childId AND RevokedAt IS NULL');
    return res.json({ revoked: result.rowsAffected[0] });
  } catch (error) {
    return next(error);
  }
}

export async function scanChildQR(req, res, next) {
  const token = typeof req.body.token === 'string' ? req.body.token.trim() : '';
  const invalidResponse = { error: 'QR Code Invalid or Unauthorized' };
  if (!token || token.length > 256) {
    try {
      const pool = await getPool();
      await recordScanAttempt(pool, req, 'INVALID_FORMAT', null);
    } catch (error) {
      console.error('Invalid QR audit failed:', error.message);
    }
    return res.status(403).json(invalidResponse);
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('tokenHash', sql.Char(64), hashToken(token))
      .query(`
        SELECT TOP 1 q.ExpiresAt, q.RevokedAt, c.ChildId, c.ChildCode, c.FirstName,
               c.LastName, c.BirthDate, c.Room, c.Status
        FROM dbo.QR_Tokens q
        INNER JOIN dbo.Children c ON c.ChildId = q.ChildId
        WHERE q.TokenHash = @tokenHash
      `);
    const record = result.recordset[0];
    const valid = record && !record.RevokedAt && new Date(record.ExpiresAt) > new Date();
    if (!valid) {
      await recordScanAttempt(pool, req, 'INVALID_OR_EXPIRED', record?.ChildId);
      return res.status(403).json(invalidResponse);
    }

    const roles = Array.isArray(req.user?.roles) ? req.user.roles : [req.user?.role];
    const allowed = roles.some((role) => ['ADMIN', 'STAFF', 'HEALTH'].includes(role));
    if (!allowed) {
      await recordScanAttempt(pool, req, 'UNAUTHORIZED', record.ChildId);
      return res.status(403).json(invalidResponse);
    }

    const [profile, medicalHistory, medications, immunizations, medicalVisits, dentalRecords, growthRecords, emergencyRecords] = await Promise.all([
      pool.request().input('childId', sql.Int, record.ChildId).query('SELECT BloodType, Allergies, Conditions, Medications, LastCheckupDate, Notes FROM dbo.Child_Health_Profile WHERE ChildId = @childId'),
      pool.request().input('childId', sql.Int, record.ChildId).query('SELECT VisitDate, Provider, Diagnosis, Notes FROM dbo.Medical_Visits WHERE ChildId = @childId ORDER BY VisitDate DESC'),
      pool.request().input('childId', sql.Int, record.ChildId).query('SELECT MedicationName, Dosage, Frequency, StartDate, EndDate, Notes FROM dbo.Medications WHERE ChildId = @childId ORDER BY StartDate DESC'),
      pool.request().input('childId', sql.Int, record.ChildId).query('SELECT VaccineName, DoseNumber, AdministeredDate, Provider FROM dbo.Immunizations WHERE ChildId = @childId ORDER BY AdministeredDate DESC'),
      pool.request().input('childId', sql.Int, record.ChildId).query('SELECT VisitDate, Provider, Diagnosis, Notes FROM dbo.Medical_Visits WHERE ChildId = @childId ORDER BY VisitDate DESC'),
      pool.request().input('childId', sql.Int, record.ChildId).query('SELECT VisitDate, Provider, Findings, Treatment FROM dbo.Dental_Records WHERE ChildId = @childId ORDER BY VisitDate DESC'),
      pool.request().input('childId', sql.Int, record.ChildId).query('SELECT RecordedDate, HeightCm, WeightKg, Notes FROM dbo.Growth_Records WHERE ChildId = @childId ORDER BY RecordedDate DESC'),
      pool.request().input('childId', sql.Int, record.ChildId).query('SELECT ContactName, Relationship, Phone, Address, IsPrimary FROM dbo.Emergency_Records WHERE ChildId = @childId ORDER BY IsPrimary DESC'),
    ]);
    const canViewFullHealthRecord = roles.includes('ADMIN') || roles.includes('HEALTH');
    const canViewDocuments = canViewFullHealthRecord;
    const canViewCareNotes = roles.includes('ADMIN') || roles.includes('HEALTH');
    const [documents, careNotes] = await Promise.all([
      canViewDocuments ? pool.request().input('childId', sql.Int, record.ChildId).query('SELECT DocumentName, StorageUrl, UploadedAt FROM dbo.Health_Documents WHERE ChildId = @childId ORDER BY UploadedAt DESC') : { recordset: [] },
      canViewCareNotes ? pool.request().input('childId', sql.Int, record.ChildId).query('SELECT NoteText, CreatedAt FROM dbo.Care_Notes WHERE ChildId = @childId ORDER BY CreatedAt DESC') : { recordset: [] },
    ]);
    await recordScanAttempt(pool, req, 'AUTHORIZED', record.ChildId);
    const minimumProfile = profile.recordset[0] ? {
      BloodType: profile.recordset[0].BloodType,
      Allergies: profile.recordset[0].Allergies,
      Conditions: profile.recordset[0].Conditions,
      Medications: profile.recordset[0].Medications,
      LastCheckupDate: profile.recordset[0].LastCheckupDate,
      ...(canViewFullHealthRecord ? { Notes: profile.recordset[0].Notes } : {}),
    } : null;
    return res.json({
      child: { id: record.ChildId, code: record.ChildCode, name: `${record.FirstName} ${record.LastName}`, birthDate: record.BirthDate, room: record.Room, status: record.Status },
      healthProfile: minimumProfile,
      medicalHistory: canViewFullHealthRecord ? medicalHistory.recordset : medicalHistory.recordset.slice(0, 1),
      medications: canViewFullHealthRecord ? medications.recordset : medications.recordset.filter((item) => !item.Notes),
      immunizations: canViewFullHealthRecord ? immunizations.recordset : [],
      medicalVisits: canViewFullHealthRecord ? medicalVisits.recordset : medicalVisits.recordset.slice(0, 1),
      dentalRecords: canViewFullHealthRecord ? dentalRecords.recordset : [],
      growthRecords: canViewFullHealthRecord ? growthRecords.recordset : [],
      emergencyRecords: canViewFullHealthRecord ? emergencyRecords.recordset : [],
      healthDocuments: documents.recordset,
      careNotes: careNotes.recordset,
    });
  } catch (error) {
    return next(error);
  }
}

export const resolveQR = scanChildQR;
