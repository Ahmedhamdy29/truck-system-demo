import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/database.js';
import { authenticateToken } from '../middleware/auth.js';
import {
  parsePagination, paginate, firstError, validateEnum, validateDate,
  validateNonNegative, validateProgress, handleDbError, connectClient
} from '../middleware/validate.js';

const router = express.Router();

const formatTrip = (trip) => ({
  id: trip.id,
  truckId: trip.truck_id,
  destination: trip.destination,
  direction: trip.direction,
  startDate: trip.start_date,
  expectedEndDate: trip.expected_end_date,
  actualEndDate: trip.actual_end_date,
  status: trip.status,
  progress: trip.progress,
  delayReason: trip.delay_reason,
  revenue: trip.revenue
});

// Get all trips (driver: own truck only)
router.get('/', authenticateToken, async (req, res) => {
  const { truckId, status } = req.query;
  const { limit, offset } = parsePagination(req);
  let query = 'SELECT * FROM trips WHERE company_id = $1';
  const params = [req.user.companyId];
  if (req.user.role === 'driver') {
    if (!req.user.truckId) return res.json([]);
    query += ' AND truck_id = $' + (params.length + 1);
    params.push(req.user.truckId);
  } else if (truckId) {
    query += ' AND truck_id = $' + (params.length + 1);
    params.push(truckId);
  }
  if (status) {
    const err = validateEnum(status, ['active', 'completed', 'delayed'], 'status');
    if (err) return res.status(400).json({ error: err });
    query += ' AND status = $' + (params.length + 1);
    params.push(status);
  }
  query += ' ORDER BY created_at DESC';
  query = paginate(query, params, { limit, offset });
  try {
    const { rows } = await db.query(query, params);
    res.json(rows.map(formatTrip));
  } catch (err) {
    return handleDbError(res, err);
  }
});

// Get trips by truck (driver: own truck only)
router.get('/truck/:truckId', authenticateToken, async (req, res) => {
  const { truckId } = req.params;
  const { limit, offset } = parsePagination(req);
  if (req.user.role === 'driver' && truckId !== req.user.truckId) {
    return res.status(403).json({ error: 'Access denied: not your truck' });
  }
  try {
    let query = 'SELECT * FROM trips WHERE truck_id = $1 AND company_id = $2 ORDER BY created_at DESC';
    const params = [truckId, req.user.companyId];
    query = paginate(query, params, { limit, offset });
    const { rows } = await db.query(query, params);
    res.json(rows.map(formatTrip));
  } catch (err) {
    return handleDbError(res, err);
  }
});

// Create new trip
router.post('/', authenticateToken, async (req, res) => {
  const { truckId, destination, direction, startDate, expectedEndDate, progress = 0, revenue } = req.body;

  if (req.user.role === 'driver' && truckId !== req.user.truckId) {
    return res.status(403).json({ error: 'Access denied: not your truck' });
  }
  if (!truckId || !destination || !direction || !startDate || !expectedEndDate) {
    return res.status(400).json({ error: 'All trip fields are required' });
  }
  const validationError = firstError(
    validateEnum(direction, ['outbound', 'return'], 'direction'),
    validateDate(startDate, 'startDate', { required: true }),
    validateDate(expectedEndDate, 'expectedEndDate', { required: true }),
    validateProgress(progress),
    validateNonNegative(revenue, 'revenue')
  );
  if (validationError) return res.status(400).json({ error: validationError });
  if (new Date(startDate) > new Date(expectedEndDate)) {
    return res.status(400).json({ error: 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية المتوقع' });
  }

  const client = await connectClient(db, res);
  if (!client) return;
  try {
    await client.query('BEGIN');

    // Lock the truck row so two concurrent creates for the same truck
    // cannot both pass the checks below.
    const truckRes = await client.query(
      'SELECT status FROM trucks WHERE id = $1 AND company_id = $2 FOR UPDATE',
      [truckId, req.user.companyId]
    );
    if (truckRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Truck not found' });
    }
    const truck = truckRes.rows[0];
    if (truck.status === 'maintenance') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'لا يمكن إنشاء رحلة لشاحنة في الصيانة' });
    }
    if (truck.status === 'in-trip') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Truck is already on a trip' });
    }

    // NOTE: there is no unique constraint preventing two active trips for the
    // same truck, so this check inside the same transaction (with the truck
    // row locked above) is the guard against duplicate active trips.
    const activeRes = await client.query(
      "SELECT id FROM trips WHERE truck_id = $1 AND company_id = $2 AND status = 'active'",
      [truckId, req.user.companyId]
    );
    if (activeRes.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Truck already has an active trip' });
    }

    const id = uuidv4();
    await client.query(
      'INSERT INTO trips (id, company_id, truck_id, destination, direction, start_date, expected_end_date, progress, revenue) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [id, req.user.companyId, truckId, destination, direction, startDate, expectedEndDate, progress, revenue || null]
    );
    await client.query(
      'UPDATE trucks SET status = $1 WHERE id = $2 AND company_id = $3',
      ['in-trip', truckId, req.user.companyId]
    );
    await client.query('COMMIT');

    res.status(201).json({
      id, truckId, destination, direction, startDate, expectedEndDate,
      actualEndDate: null, status: 'active', progress, delayReason: null, revenue: revenue || null
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return handleDbError(res, err);
  } finally {
    client.release();
  }
});

// Update trip — always scoped to the user's company (IDOR fix).
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { destination, direction, startDate, expectedEndDate, actualEndDate, status, progress, delayReason, revenue } = req.body;

  const validationError = firstError(
    validateEnum(direction, ['outbound', 'return'], 'direction'),
    validateEnum(status, ['active', 'completed', 'delayed'], 'status'),
    validateDate(startDate, 'startDate'),
    validateDate(expectedEndDate, 'expectedEndDate'),
    validateDate(actualEndDate, 'actualEndDate'),
    validateProgress(progress),
    validateNonNegative(revenue, 'revenue')
  );
  if (validationError) return res.status(400).json({ error: validationError });

  const client = await connectClient(db, res);
  if (!client) return;
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT truck_id, status FROM trips WHERE id = $1 AND company_id = $2 FOR UPDATE',
      [id, req.user.companyId]
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Trip not found' });
    }
    const trip = rows[0];
    if (req.user.role === 'driver' && trip.truck_id !== req.user.truckId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Access denied: not your truck' });
    }

    const updateResult = await client.query(
      `UPDATE trips SET
       destination = COALESCE($1, destination),
       direction = COALESCE($2, direction),
       start_date = COALESCE($3, start_date),
       expected_end_date = COALESCE($4, expected_end_date),
       actual_end_date = COALESCE($5, actual_end_date),
       status = COALESCE($6, status),
       progress = COALESCE($7, progress),
       delay_reason = COALESCE($8, delay_reason),
       revenue = COALESCE($9, revenue),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 AND company_id = $11`,
      [destination ?? null, direction ?? null, startDate ?? null, expectedEndDate ?? null,
       actualEndDate ?? null, status ?? null, progress ?? null, delayReason ?? null,
       revenue ?? null, id, req.user.companyId]
    );
    if (updateResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Trip not found' });
    }

    // If the trip was completed, free the truck — in the same transaction.
    if (status === 'completed') {
      await client.query(
        'UPDATE trucks SET status = $1 WHERE id = $2 AND company_id = $3',
        ['available', trip.truck_id, req.user.companyId]
      );
    }
    await client.query('COMMIT');
    res.json({ message: 'Trip updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return handleDbError(res, err);
  } finally {
    client.release();
  }
});

// Complete trip — scoped to the user's company (IDOR fix).
router.post('/:id/complete', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const actualEndDate = new Date().toISOString().split('T')[0];

  const client = await connectClient(db, res);
  if (!client) return;
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT truck_id, status FROM trips WHERE id = $1 AND company_id = $2 FOR UPDATE',
      [id, req.user.companyId]
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Trip not found' });
    }
    const trip = rows[0];
    if (req.user.role === 'driver' && trip.truck_id !== req.user.truckId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Access denied: not your truck' });
    }
    if (trip.status === 'completed') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'الرحلة مكتملة بالفعل' });
    }

    await client.query(
      'UPDATE trips SET status = $1, actual_end_date = $2, progress = 100, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND company_id = $4',
      ['completed', actualEndDate, id, req.user.companyId]
    );
    await client.query(
      'UPDATE trucks SET status = $1 WHERE id = $2 AND company_id = $3',
      ['available', trip.truck_id, req.user.companyId]
    );
    await client.query('COMMIT');
    res.json({ message: 'Trip completed successfully' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return handleDbError(res, err);
  } finally {
    client.release();
  }
});

// Delete trip — scoped to the user's company (IDOR fix).
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  const client = await connectClient(db, res);
  if (!client) return;
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT truck_id, status FROM trips WHERE id = $1 AND company_id = $2 FOR UPDATE',
      [id, req.user.companyId]
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Trip not found' });
    }
    const trip = rows[0];
    if (req.user.role === 'driver' && trip.truck_id !== req.user.truckId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Access denied: not your truck' });
    }

    await client.query('DELETE FROM trips WHERE id = $1 AND company_id = $2', [id, req.user.companyId]);
    if (trip.status === 'active') {
      await client.query(
        'UPDATE trucks SET status = $1 WHERE id = $2 AND company_id = $3',
        ['available', trip.truck_id, req.user.companyId]
      );
    }
    await client.query('COMMIT');
    res.json({ message: 'Trip deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return handleDbError(res, err);
  } finally {
    client.release();
  }
});

export default router;
