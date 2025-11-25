import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all trucks for the user's company
router.get('/', authenticateToken, async (req, res) => {
  const query = `
    SELECT t.*, COALESCE(u.name, t.driver_name) as driver_name 
    FROM trucks t 
    LEFT JOIN users u ON t.id = u.truck_id 
    WHERE t.company_id = $1 
    ORDER BY t.created_at DESC
  `;
  const params = [req.user.companyId];

  try {
    const { rows } = await db.query(query, params);
    const formattedTrucks = rows.map(truck => ({
      id: truck.id,
      number: truck.number,
      model: truck.model,
      year: truck.year,
      plateNumber: truck.plate_number,
      engineNumber: truck.engine_number,
      chassisNumber: truck.chassis_number,
      loadCapacity: truck.load_capacity,
      status: truck.status,
      lastMaintenance: truck.last_maintenance,
      nextMaintenance: truck.next_maintenance,
      driverName: truck.driver_name,
      createdAt: truck.created_at,
      updatedAt: truck.updated_at
    }));
    res.json(formattedTrucks);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Get truck by ID (only if it belongs to user's company)
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await db.query(
      'SELECT * FROM trucks WHERE id = $1 AND company_id = $2',
      [id, req.user.companyId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Truck not found' });
    }

    const truck = rows[0];
    const formattedTruck = {
      id: truck.id,
      number: truck.number,
      model: truck.model,
      year: truck.year,
      plateNumber: truck.plate_number,
      engineNumber: truck.engine_number,
      chassisNumber: truck.chassis_number,
      loadCapacity: truck.load_capacity,
      status: truck.status,
      lastMaintenance: truck.last_maintenance,
      nextMaintenance: truck.next_maintenance,
      driverName: truck.driver_name,
      createdAt: truck.created_at,
      updatedAt: truck.updated_at
    };

    res.json(formattedTruck);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Create new truck (Admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  const { 
    number, 
    model, 
    year, 
    plateNumber, 
    engineNumber, 
    chassisNumber, 
    loadCapacity,
    driverName 
  } = req.body;

  if (!number || !model || !year || !plateNumber || !engineNumber || !chassisNumber || !loadCapacity) {
    return res.status(400).json({ error: 'All required truck fields must be provided' });
  }

  const id = uuidv4();

  try {
    await db.query(
      `INSERT INTO trucks (
      id, company_id, number, model, year, plate_number, engine_number, 
      chassis_number, load_capacity, driver_name
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, req.user.companyId, number, model, year, plateNumber, engineNumber, chassisNumber, loadCapacity, driverName]
    );

    const newTruck = {
      id,
      number,
      model,
      year,
      plateNumber,
      engineNumber,
      chassisNumber,
      loadCapacity,
      driverName,
      status: 'available'
    };

    res.status(201).json(newTruck);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Truck number, plate number, engine number, or chassis number already exists in your company' });
    }
    res.status(500).json({ error: 'Failed to create truck', details: err.message });
  }
});

// Update truck (Admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { 
    number, 
    model, 
    year, 
    plateNumber, 
    engineNumber, 
    chassisNumber, 
    loadCapacity,
    status,
    driverName 
  } = req.body;

  // First check if truck belongs to user's company
  try {
    const { rows } = await db.query('SELECT id FROM trucks WHERE id = $1 AND company_id = $2', [id, req.user.companyId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Truck not found' });
    }

    await db.query(
      `UPDATE trucks SET 
       number = COALESCE($1, number),
       model = COALESCE($2, model),
       year = COALESCE($3, year),
       plate_number = COALESCE($4, plate_number),
       engine_number = COALESCE($5, engine_number),
       chassis_number = COALESCE($6, chassis_number),
       load_capacity = COALESCE($7, load_capacity),
       status = COALESCE($8, status),
       driver_name = COALESCE($9, driver_name),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 AND company_id = $11`,
      [number, model, year, plateNumber, engineNumber, chassisNumber, loadCapacity, status, driverName, id, req.user.companyId]
    );

    res.json({ message: 'Truck updated successfully' });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Truck number, plate number, engine number, or chassis number already exists in your company' });
    }
    res.status(500).json({ error: 'Failed to update truck', details: err.message });
  }
});

// Delete truck (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  // First check if truck belongs to user's company
  try {
    const { rows } = await db.query('SELECT id FROM trucks WHERE id = $1 AND company_id = $2', [id, req.user.companyId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Truck not found' });
    }

    await db.query('DELETE FROM trucks WHERE id = $1 AND company_id = $2', [id, req.user.companyId]);
    res.json({ message: 'Truck deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete truck', details: err.message });
  }
});

export default router;