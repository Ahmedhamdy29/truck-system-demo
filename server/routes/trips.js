import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all trips
router.get('/', authenticateToken, async (req, res) => {
  const { truckId, status } = req.query;
  let query = 'SELECT * FROM trips WHERE company_id = $1';
  const params = [req.user.companyId];
  if (truckId) {
    query += ' AND truck_id = $' + (params.length + 1);
    params.push(truckId);
  }
  if (status) {
    query += ' AND status = $' + (params.length + 1);
    params.push(status);
  }
  query += ' ORDER BY created_at DESC';
  try {
    const { rows } = await db.query(query, params);
    const formattedTrips = rows.map(trip => ({
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
    }));
    res.json(formattedTrips);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Get trips by truck
router.get('/truck/:truckId', authenticateToken, async (req, res) => {
  const { truckId } = req.params;

  try {
    const { rows } = await db.query(
      'SELECT * FROM trips WHERE truck_id = $1 AND company_id = $2 ORDER BY created_at DESC',
      [truckId, req.user.companyId]
    );

    const formattedTrips = rows.map(trip => ({
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
    }));

    res.json(formattedTrips);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Create new trip
router.post('/', authenticateToken, async (req, res) => {
  const { truckId, destination, direction, startDate, expectedEndDate, progress = 0, revenue } = req.body;

  // تقييد السائق
  if (req.user.role === 'driver' && truckId !== req.user.truckId) {
    return res.status(403).json({ error: 'Access denied: not your truck' });
  }

  if (!truckId || !destination || !direction || !startDate || !expectedEndDate) {
    return res.status(400).json({ error: 'All trip fields are required' });
  }

  // Check if truck is available
  try {
    const { rows } = await db.query('SELECT status FROM trucks WHERE id = $1 AND company_id = $2', [truckId, req.user.companyId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Truck not found' });
    }
    const truck = rows[0];

    if (truck.status === 'in-trip') {
      return res.status(400).json({ error: 'Truck is already on a trip' });
    }

    const id = uuidv4();

    await db.query(
      'INSERT INTO trips (id, company_id, truck_id, destination, direction, start_date, expected_end_date, progress, revenue) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [id, req.user.companyId, truckId, destination, direction, startDate, expectedEndDate, progress, revenue || null]
    );

    // Update truck status to in-trip
    await db.query(
      'UPDATE trucks SET status = $1 WHERE id = $2 AND company_id = $3',
      ['in-trip', truckId, req.user.companyId]
    );

    const newTrip = {
      id,
      truckId,
      destination,
      direction,
      startDate,
      expectedEndDate,
      actualEndDate: null,
      status: 'active',
      progress,
      delayReason: null,
      revenue: revenue || null
    };

    res.status(201).json(newTrip);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Update trip
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { destination, direction, startDate, expectedEndDate, actualEndDate, status, progress, delayReason, revenue } = req.body;

  // جلب الرحلة أولاً للتحقق من ملكية الشاحنة
  try {
    const { rows } = await db.query('SELECT truck_id FROM trips WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    const trip = rows[0];

    if (req.user.role === 'driver' && trip.truck_id !== req.user.truckId) {
      return res.status(403).json({ error: 'Access denied: not your truck' });
    }

    await db.query(
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
       WHERE id = $10`,
      [destination, direction, startDate, expectedEndDate, actualEndDate, status, progress, delayReason, revenue, id]
    );

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // If trip is completed, update truck status
    if (status === 'completed') {
      await db.query('SELECT truck_id FROM trips WHERE id = $1', [id]);
      if (rows.length > 0) {
        await db.query('UPDATE trucks SET status = $1 WHERE id = $2', ['available', rows[0].truck_id]);
      }
    }

    res.json({ message: 'Trip updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Complete trip
router.post('/:id/complete', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const actualEndDate = new Date().toISOString().split('T')[0];

  // جلب الرحلة أولاً للتحقق من ملكية الشاحنة
  try {
    const { rows } = await db.query('SELECT truck_id FROM trips WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    const trip = rows[0];

    if (req.user.role === 'driver' && trip.truck_id !== req.user.truckId) {
      return res.status(403).json({ error: 'Access denied: not your truck' });
    }

    await db.query(
      'UPDATE trips SET status = $1, actual_end_date = $2, progress = 100, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      ['completed', actualEndDate, id]
    );

    // Update truck status
    await db.query('UPDATE trucks SET status = $1 WHERE id = $2', ['available', trip.truck_id]);

    res.json({ message: 'Trip completed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Delete trip
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  // Get trip info before deletion
  try {
    const { rows } = await db.query('SELECT truck_id, status FROM trips WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    const trip = rows[0];

    // تقييد السائق
    if (req.user.role === 'driver' && trip.truck_id !== req.user.truckId) {
      return res.status(403).json({ error: 'Access denied: not your truck' });
    }

    await db.query('DELETE FROM trips WHERE id = $1', [id]);

    // If trip was active, update truck status to available
    if (trip.status === 'active') {
      await db.query('UPDATE trucks SET status = $1 WHERE id = $2', ['available', trip.truck_id]);
    }

    res.json({ message: 'Trip deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

export default router;