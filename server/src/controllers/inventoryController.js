import { getPool, sql } from '../config/db.js';

export async function listInventory(req, res, next) {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT InventoryItemId, ItemCode, ItemName, Category, Quantity, Unit,
             LowStockThreshold, UpdatedAt,
             CASE WHEN Quantity <= LowStockThreshold THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT) END AS IsLowStock
      FROM dbo.Inventory_Items ORDER BY ItemName
    `);
    return res.json(result.recordset);
  } catch (error) {
    return next(error);
  }
}

export async function lowStockAlerts(req, res, next) {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT InventoryItemId, ItemCode, ItemName, Category, Quantity, Unit, LowStockThreshold
      FROM dbo.Inventory_Items
      WHERE Quantity <= LowStockThreshold
      ORDER BY Quantity ASC, ItemName
    `);
    return res.json({ count: result.recordset.length, items: result.recordset });
  } catch (error) {
    return next(error);
  }
}

export async function adjustInventory(req, res, next) {
  const transaction = new sql.Transaction(await getPool());
  try {
    const { quantityChange, reason } = req.body;
    if (!Number.isFinite(Number(quantityChange))) return res.status(400).json({ error: 'quantityChange must be numeric' });
    await transaction.begin();
    const request = new sql.Request(transaction);
    const item = await request
      .input('itemId', sql.Int, Number(req.params.id))
      .query('SELECT Quantity FROM dbo.Inventory_Items WHERE InventoryItemId = @itemId');
    if (!item.recordset[0]) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Inventory item not found' });
    }
    const nextQuantity = Number(item.recordset[0].Quantity) + Number(quantityChange);
    if (nextQuantity < 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Inventory quantity cannot be negative' });
    }
    await new sql.Request(transaction)
      .input('itemId', sql.Int, Number(req.params.id))
      .input('quantity', sql.Decimal(12, 2), nextQuantity)
      .query('UPDATE dbo.Inventory_Items SET Quantity = @quantity, UpdatedAt = SYSUTCDATETIME() WHERE InventoryItemId = @itemId');
    await new sql.Request(transaction)
      .input('itemId', sql.Int, Number(req.params.id))
      .input('userId', sql.Int, Number(req.user.userId))
      .input('quantityChange', sql.Decimal(12, 2), Number(quantityChange))
      .input('reason', sql.NVarChar(255), reason || null)
      .query(`INSERT INTO dbo.Inventory_Transactions (InventoryItemId, UserId, QuantityChange, Reason)
              VALUES (@itemId, @userId, @quantityChange, @reason)`);
    await transaction.commit();
    return res.json({ inventoryItemId: Number(req.params.id), quantity: nextQuantity });
  } catch (error) {
    if (transaction._aborted === false) await transaction.rollback().catch(() => {});
    return next(error);
  }
}
