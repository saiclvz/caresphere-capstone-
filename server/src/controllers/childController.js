import { getPool, sql } from '../config/db.js';

const childColumns = `ChildId, ChildCode, FirstName, LastName, BirthDate, Gender, Room, Status, AdmissionDate, CreatedAt, UpdatedAt`;

export async function listChildren(req, res, next) {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`SELECT ${childColumns} FROM dbo.Children ORDER BY LastName, FirstName`);
    return res.json(result.recordset);
  } catch (error) {
    return next(error);
  }
}

export async function getChild(req, res, next) {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('childId', sql.Int, Number(req.params.id))
      .query(`
        SELECT c.*, h.HealthProfileId, h.BloodType, h.Allergies, h.Conditions,
               h.Medications, h.LastCheckupDate, h.Notes
        FROM dbo.Children c
        LEFT JOIN dbo.Child_Health_Profile h ON h.ChildId = c.ChildId
        WHERE c.ChildId = @childId
      `);
    if (!result.recordset[0]) return res.status(404).json({ error: 'Child not found' });
    return res.json(result.recordset[0]);
  } catch (error) {
    return next(error);
  }
}

export async function createChild(req, res, next) {
  try {
    const { childCode, firstName, lastName, birthDate, gender, room, status, admissionDate } = req.body;
    if (!childCode || !firstName || !lastName) return res.status(400).json({ error: 'childCode, firstName and lastName are required' });
    const pool = await getPool();
    const result = await pool.request()
      .input('childCode', sql.NVarChar(40), childCode)
      .input('firstName', sql.NVarChar(80), firstName)
      .input('lastName', sql.NVarChar(80), lastName)
      .input('birthDate', sql.Date, birthDate || null)
      .input('gender', sql.NVarChar(30), gender || null)
      .input('room', sql.NVarChar(80), room || null)
      .input('status', sql.NVarChar(30), status || 'Active')
      .input('admissionDate', sql.Date, admissionDate || null)
      .query(`
        INSERT INTO dbo.Children (ChildCode, FirstName, LastName, BirthDate, Gender, Room, Status, AdmissionDate)
        OUTPUT INSERTED.*
        VALUES (@childCode, @firstName, @lastName, @birthDate, @gender, @room, @status, @admissionDate)
      `);
    return res.status(201).json(result.recordset[0]);
  } catch (error) {
    return next(error);
  }
}

export async function updateChild(req, res, next) {
  try {
    const { firstName, lastName, birthDate, gender, room, status, admissionDate } = req.body;
    const pool = await getPool();
    const result = await pool.request()
      .input('childId', sql.Int, Number(req.params.id))
      .input('firstName', sql.NVarChar(80), firstName)
      .input('lastName', sql.NVarChar(80), lastName)
      .input('birthDate', sql.Date, birthDate || null)
      .input('gender', sql.NVarChar(30), gender || null)
      .input('room', sql.NVarChar(80), room || null)
      .input('status', sql.NVarChar(30), status || 'Active')
      .input('admissionDate', sql.Date, admissionDate || null)
      .query(`
        UPDATE dbo.Children
        SET FirstName = @firstName, LastName = @lastName, BirthDate = @birthDate,
            Gender = @gender, Room = @room, Status = @status,
            AdmissionDate = @admissionDate, UpdatedAt = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE ChildId = @childId
      `);
    if (!result.recordset[0]) return res.status(404).json({ error: 'Child not found' });
    return res.json(result.recordset[0]);
  } catch (error) {
    return next(error);
  }
}

export async function deleteChild(req, res, next) {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('childId', sql.Int, Number(req.params.id))
      .query('DELETE FROM dbo.Children WHERE ChildId = @childId');
    if (!result.rowsAffected[0]) return res.status(404).json({ error: 'Child not found' });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

export async function upsertHealthProfile(req, res, next) {
  try {
    const { bloodType, allergies, conditions, medications, lastCheckupDate, notes } = req.body;
    const pool = await getPool();
    const result = await pool.request()
      .input('childId', sql.Int, Number(req.params.id))
      .input('bloodType', sql.NVarChar(10), bloodType || null)
      .input('allergies', sql.NVarChar(1000), allergies || null)
      .input('conditions', sql.NVarChar(1000), conditions || null)
      .input('medications', sql.NVarChar(1000), medications || null)
      .input('lastCheckupDate', sql.Date, lastCheckupDate || null)
      .input('notes', sql.NVarChar(2000), notes || null)
      .query(`
        MERGE dbo.Child_Health_Profile AS target
        USING (SELECT @childId AS ChildId) AS source ON target.ChildId = source.ChildId
        WHEN MATCHED THEN UPDATE SET BloodType = @bloodType, Allergies = @allergies,
          Conditions = @conditions, Medications = @medications, LastCheckupDate = @lastCheckupDate,
          Notes = @notes, UpdatedAt = SYSUTCDATETIME()
        WHEN NOT MATCHED THEN INSERT (ChildId, BloodType, Allergies, Conditions, Medications, LastCheckupDate, Notes)
          VALUES (@childId, @bloodType, @allergies, @conditions, @medications, @lastCheckupDate, @notes)
        OUTPUT INSERTED.*;
      `);
    return res.json(result.recordset[0]);
  } catch (error) {
    return next(error);
  }
}
