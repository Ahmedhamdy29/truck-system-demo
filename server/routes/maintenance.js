import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all maintenance records
router.get('/', authenticateToken, async (req, res) => {
  const { truckId, type } = req.query;
  let query = 'SELECT * FROM maintenance_records WHERE company_id = $1';
  const params = [req.user.companyId];

  if (truckId) {
    query += ' AND truck_id = $' + (params.length + 1);
    params.push(truckId);
  }
  if (type) {
    query += ' AND type = $' + (params.length + 1);
    params.push(type);
  }
  query += ' ORDER BY date DESC';

  try {
    const { rows } = await db.query(query, params);
    const formattedRecords = rows.map(record => ({
      id: record.id,
      truckId: record.truck_id,
      type: record.type,
      date: record.date,
      cost: record.cost,
      description: record.description,
      nextDue: record.next_due
    }));
    res.json(formattedRecords);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Get maintenance records by truck
router.get('/truck/:truckId', authenticateToken, async (req, res) => {
  const { truckId } = req.params;
  try {
    const { rows } = await db.query(
      'SELECT * FROM maintenance_records WHERE truck_id = $1 AND company_id = $2 ORDER BY date DESC',
      [truckId, req.user.companyId]
    );
    const formattedRecords = rows.map(record => ({
      id: record.id,
      truckId: record.truck_id,
      type: record.type,
      date: record.date,
      cost: record.cost,
      description: record.description,
      nextDue: record.next_due
    }));
    res.json(formattedRecords);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Create new maintenance record
router.post('/', authenticateToken, async (req, res) => {
  const { truckId, type, date, cost, description, nextDue } = req.body;
  if (req.user.role === 'driver' && truckId !== req.user.truckId) {
    return res.status(403).json({ error: 'Access denied: not your truck' });
  }
  if (!truckId || !type || !date || !cost || !description) {
    return res.status(400).json({ error: 'All required maintenance fields must be provided' });
  }
  const id = uuidv4();
  try {
    await db.query(
      'INSERT INTO maintenance_records (id, company_id, truck_id, type, date, cost, description, next_due) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, req.user.companyId, truckId, type, date, cost, description, nextDue]
    );
    // Update truck's last maintenance date
    await db.query(
      'UPDATE trucks SET last_maintenance = $1, next_maintenance = $2 WHERE id = $3 AND company_id = $4',
      [date, nextDue, truckId, req.user.companyId]
    );
    const newRecord = {
      id,
      truckId,
      type,
      date,
      cost,
      description,
      nextDue
    };
    res.status(201).json(newRecord);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create maintenance record', details: err.message });
  }
});

// Update maintenance record
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { truckId, type, date, cost, description, nextDue } = req.body;
  try {
    const { rows } = await db.query('SELECT truck_id FROM maintenance_records WHERE id = $1', [id]);
    const record = rows[0];
    if (!record) {
      return res.status(404).json({ error: 'Maintenance record not found' });
    }
    if (req.user.role === 'driver' && record.truck_id !== req.user.truckId) {
      return res.status(403).json({ error: 'Access denied: not your truck' });
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
       WHERE id = $7`,
      [truckId, type, date, cost, description, nextDue, id]
    );
    if (updateResult.rowCount === 0) {
      return res.status(404).json({ error: 'Maintenance record not found' });
    }
    res.json({ message: 'Maintenance record updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update maintenance record', details: err.message });
  }
});

// Delete maintenance record
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query('SELECT truck_id FROM maintenance_records WHERE id = $1', [id]);
    const record = rows[0];
    if (!record) {
      return res.status(404).json({ error: 'Maintenance record not found' });
    }
    if (req.user.role === 'driver' && record.truck_id !== req.user.truckId) {
      return res.status(403).json({ error: 'Access denied: not your truck' });
    }
    const deleteResult = await db.query('DELETE FROM maintenance_records WHERE id = $1', [id]);
    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ error: 'Maintenance record not found' });
    }
    res.json({ message: 'Maintenance record deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete maintenance record', details: err.message });
  }
});

export default router;