import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/database.js';
import { authenticateToken } from '../middleware/auth.js';
import {
  parsePagination, paginate, firstError, validateEnum, validateDate,
  validateNonNegative, handleDbError, requireCompanyTruck, connectClient
} from '../middleware/validate.js';

const router = express.Router();

const formatRecord = (record) => ({
  id: record.id,
  truckId: record.truck_id,
  type: record.type,
  date: record.date,
  cost: record.cost,
  description: record.description,
  nextDue: record.next_due
});

const MAINTENANCE_TYPES = ['periodic', 'tire-check', 'oil-change', 'comprehensive'];

// Get all maintenance records (driver: own truck only)
router.get('/', authenticateToken, async (req, res) => {
  const { truckId, type } = req.query;
  const { limit, offset } = parsePagination(req);
  let query = 'SELECT * FROM maintenance_records WHERE company_id = $1';
  const params = [req.user.companyId];

  if (req.user.role === 'driver') {
    if (!req.user.truckId) return res.json([]);
    query += ' AND truck_id = $' + (params.length + 1);
    params.push(req.user.truckId);
  } else if (truckId) {
    query += ' AND truck_id = $' + (params.length + 1);
    params.push(truckId);
  }
  if (type) {
    const err = validateEnum(type, MAINTENANCE_TYPES, 'type');
    if (err) return res.status(400).json({ error: err });
    query += ' AND type = $' + (params.length + 1);
    params.push(type);
  }
  query += ' ORDER BY date DESC';
  query = paginate(query, params, { limit, offset });

  try {
    const { rows } = await db.query(query, params);
    res.json(rows.map(formatRecord));
  } catch (err) {
    return handleDbError(res, err);
  }
});

// Get maintenance records by truck (driver: own truck only)
router.get('/truck/:truckId', authenticateToken, async (req, res) => {
  const { truckId } = req.params;
  const { limit, offset } = parsePagination(req);
  if (req.user.role === 'driver' && truckId !== req.user.truckId) {
    return res.status(403).json({ error: 'Access denied: not your truck' });
  }
  try {
    let query = 'SELECT * FROM maintenance_records WHERE truck_id = $1 AND company_id = $2 ORDER BY date DESC';
    const params = [truckId, req.user.companyId];
    query = paginate(query, params, { limit, offset });
    const { rows } = await db.query(query, params);
    res.json(rows.map(formatRecord));
  } catch (err) {
    return handleDbError(res, err);
  }
});

// Create new maintenance record — insert + truck dates in one transaction.
router.post('/', authenticateToken, async (req, res) => {
  const { truckId, type, date, cost, description, nextDue } = req.body;
  if (req.user.role === 'driver' && truckId !== req.user.truckId) {
    return res.status(403).json({ error: 'Access denied: not your truck' });
  }
  if (!truckId || !type || !date || cost === undefined || cost === null || !description) {
    return res.status(400).json({ error: 'All required maintenance fields must be provided' });
  }
  const validationError = firstError(
    validateEnum(type, MAINTENANCE_TYPES, 'type'),
    validateDate(date, 'date', { required: true }),
    validateDate(nextDue, 'nextDue'),
    validateNonNegative(cost, 'cost', { required: true })
  );
  if (validationError) return res.status(400).json({ error: validationError });

  const id = uuidv4();
  const client = await connectClient(db, res);
  if (!client) return;
  try {
    await client.query('BEGIN');
    const truck = await requireCompanyTruck(db, res, truckId, req.user.companyId);
    if (!truck) {
      await client.query('ROLLBACK').catch(() => {});
      return;
    }
    await client.query(
      'INSERT INTO maintenance_records (id, company_id, truck_id, type, date, cost, description, next_due) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, req.user.companyId, truckId, type, date, cost, description, nextDue || null]
    );
    await client.query(
      'UPDATE trucks SET last_maintenance = $1, next_maintenance = $2 WHERE id = $3 AND company_id = $4',
      [date, nextDue || null, truckId, req.user.companyId]
    );
    await client.query('COMMIT');
    res.status(201).json({ id, truckId, type, date, cost, description, nextDue: nextDue || null });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return handleDbError(res, err);
  } finally {
    client.release();
  }
});

// Update maintenance record — scoped to the user's company (IDOR fix).
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { truckId, type, date, cost, description, nextDue } = req.body;

  const validationError = firstError(
    validateEnum(type, MAINTENANCE_TYPES, 'type'),
    validateDate(date, 'date'),
    validateDate(nextDue, 'nextDue'),
    validateNonNegative(cost, 'cost')
  );
  if (validationError) return res.status(400).json({ error: validationError });

  try {
    const { rows } = await db.query(
      'SELECT truck_id FROM maintenance_records WHERE id = $1 AND company_id = $2',
      [id, req.user.companyId]
    );
    const record = rows[0];
    if (!record) {
      return res.status(404).json({ error: 'Maintenance record not found' });
    }
    if (req.user.role === 'driver' && record.truck_id !== req.user.truckId) {
      return res.status(403).json({ error: 'Access denied: not your truck' });
    }
    if (truckId !== undefined && truckId !== null) {
      if (req.user.role === 'driver' && truckId !== req.user.truckId) {
        return res.status(403).json({ error: 'Access denied: not your truck' });
      }
      const truck = await requireCompanyTruck(db, res, truckId, req.user.companyId);
      if (!truck) return;
    }

    const updateResult = await db.query(
      `UPDATE maintenance_records SET
         truck_id = COALESCE($1, truck_id),
         type = COALESCE($2, type),
         date = COALESCE($3, date),
         cost = COALESCE($4, cost),
         description = COALESCE($5, description),
         next_due = COALESCE($6, next_due),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND company_id = $8`,
      [truckId ?? null, type ?? null, date ?? null, cost ?? null, description ?? null,
       nextDue ?? null, id, req.user.companyId]
    );
    if (updateResult.rowCount === 0) {
      return res.status(404).json({ error: 'Maintenance record not found' });
    }
    res.json({ message: 'Maintenance record updated successfully' });
  } catch (err) {
    return handleDbError(res, err);
  }
});

// Delete maintenance record — scoped to the user's company (IDOR fix).
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query(
      'SELECT truck_id FROM maintenance_records WHERE id = $1 AND company_id = $2',
      [id, req.user.companyId]
    );
    const record = rows[0];
    if (!record) {
      return res.status(404).json({ error: 'Maintenance record not found' });
    }
    if (req.user.role === 'driver' && record.truck_id !== req.user.truckId) {
      return res.status(403).json({ error: 'Access denied: not your truck' });
    }
    const deleteResult = await db.query(
      'DELETE FROM maintenance_records WHERE id = $1 AND company_id = $2',
      [id, req.user.companyId]
    );
    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ error: 'Maintenance record not found' });
    }
    res.json({ message: 'Maintenance record deleted successfully' });
  } catch (err) {
    return handleDbError(res, err);
  }
});

export default router;
