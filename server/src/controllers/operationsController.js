import crypto from 'node:crypto';
import QRCode from 'qrcode';
import { getPool, sql } from '../config/db.js';

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export async function checkInVisitor(req, res, next) {
  try {
    const { visitorName, purpose } = req.body;
    if (!visitorName) return res.status(400).json({ error: 'visitorName is required' });
    const token = crypto.randomBytes(24).toString('hex');
    const pool = await getPool();
    const result = await pool.request()
      .input('visitorName', sql.NVarChar(160), visitorName)
      .input('purpose', sql.NVarChar(255), purpose || null)
      .input('tokenHash', sql.Char(64), hash(token))
      .input('createdBy', sql.Int, Number(req.user.userId))
      .query(`INSERT INTO dbo.Visitor_Logs (VisitorName, Purpose, CheckInTokenHash, CreatedBy)
              OUTPUT INSERTED.VisitorLogId, INSERTED.CheckInAt
              VALUES (@visitorName, @purpose, @tokenHash, @createdBy)`);
    return res.status(201).json({ ...result.recordset[0], checkoutToken: token });
  } catch (error) {
    return next(error);
  }
}

export async function checkOutVisitor(req, res, next) {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('visitorId', sql.BigInt, Number(req.params.id))
      .query('UPDATE dbo.Visitor_Logs SET CheckOutAt = SYSUTCDATETIME() WHERE VisitorLogId = @visitorId AND CheckOutAt IS NULL');
    if (!result.rowsAffected[0]) return res.status(404).json({ error: 'Active visitor record not found' });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

export async function listVisitors(req, res, next) {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT TOP 100 * FROM dbo.Visitor_Logs ORDER BY CheckInAt DESC');
    return res.json(result.recordset);
  } catch (error) {
    return next(error);
  }
}

export async function createShift(req, res, next) {
  try {
    const { userId, shiftDate, startTime, endTime, status } = req.body;
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, Number(userId))
      .input('shiftDate', sql.Date, shiftDate)
      .input('startTime', sql.VarChar(20), startTime)
      .input('endTime', sql.VarChar(20), endTime)
      .input('status', sql.NVarChar(30), status || 'Scheduled')
      .query(`INSERT INTO dbo.Staff_Shifts (UserId, ShiftDate, StartTime, EndTime, Status)
              OUTPUT INSERTED.* VALUES (@userId, @shiftDate, @startTime, @endTime, @status)`);
    return res.status(201).json(result.recordset[0]);
  } catch (error) {
    return next(error);
  }
}

export async function createMealDelivery(req, res, next) {
  try {
    const { deliveryDate, mealType, menu, quantity } = req.body;
    const pool = await getPool();
    const result = await pool.request()
      .input('deliveryDate', sql.Date, deliveryDate)
      .input('mealType', sql.NVarChar(30), mealType)
      .input('menu', sql.NVarChar(500), menu)
      .input('quantity', sql.Int, quantity || null)
      .input('deliveredBy', sql.Int, Number(req.user.userId))
      .input('deliveredAt', sql.DateTime2, new Date())
      .query(`INSERT INTO dbo.Meal_Deliveries (DeliveryDate, MealType, Menu, Quantity, DeliveredBy, DeliveredAt)
              OUTPUT INSERTED.* VALUES (@deliveryDate, @mealType, @menu, @quantity, @deliveredBy, @deliveredAt)`);
    return res.status(201).json(result.recordset[0]);
  } catch (error) {
    return next(error);
  }
}

export async function createDonation(req, res, next) {
  try {
    const { donorName, amount, category } = req.body;
    if (!donorName) return res.status(400).json({ error: 'donorName is required' });
    const receiptToken = crypto.randomBytes(24).toString('hex');
    const pool = await getPool();
    const donation = await pool.request()
      .input('donorName', sql.NVarChar(160), donorName)
      .input('amount', sql.Decimal(12, 2), Number(amount || 0))
      .input('category', sql.NVarChar(80), category || null)
      .query('INSERT INTO dbo.Donations (DonorName, Amount, Category) OUTPUT INSERTED.* VALUES (@donorName, @amount, @category)');
    await pool.request()
      .input('donationId', sql.Int, donation.recordset[0].DonationId)
      .input('receiptHash', sql.Char(64), hash(receiptToken))
      .query('INSERT INTO dbo.Donation_Receipts (DonationId, ReceiptTokenHash) VALUES (@donationId, @receiptHash)');
    const receiptUrl = `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/receipts/resolve?token=${receiptToken}`;
    const dataUrl = await QRCode.toDataURL(receiptUrl, { margin: 1, width: 280 });
    return res.status(201).json({ donation: donation.recordset[0], receiptToken, dataUrl });
  } catch (error) {
    return next(error);
  }
}
