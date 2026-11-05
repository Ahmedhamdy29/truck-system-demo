import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import {
  parsePagination, paginate, firstError, validateEnum, validateNonNegative,
  handleDbError
} from '../middleware/validate.js';

const router = express.Router();

const TRUCK_STATUSES = ['available', 'in-trip', 'maintenance'];

const formatTruck = (truck) => ({
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
});

// Get all trucks for the user's company.
// A driver sees only their own truck; an admin sees the whole company.
router.get('/', authenticateToken, async (req, res) => {
  const { limit, offset } = parsePagination(req);
  let query = `
    SELECT t.*, COALESCE(u.name, t.driver_name) as driver_name
    FROM trucks t
    LEFT JOIN users u ON t.id = u.truck_id
    WHERE t.company_id = $1
  `;
  const params = [req.user.companyId];
  if (req.user.role === 'driver') {
    if (!req.user.truckId) return res.json([]);
    query += ' AND t.id = $' + (params.length + 1);
    params.push(req.user.truckId);
  }
  query += ' ORDER BY t.created_at DESC';
  query = paginate(query, params, { limit, offset });

  try {
    const { rows } = await db.query(query, params);
    res.json(rows.map(formatTruck));
  } catch (err) {
    return handleDbError(res, err);
  }
});

// Get truck by ID (only if it belongs to user's company; driver: own truck only)
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  if (req.user.role === 'driver' && id !== req.user.truckId) {
    return res.status(403).json({ error: 'Access denied: not your truck' });
  }

  try {
    const { rows } = await db.query(
      'SELECT * FROM trucks WHERE id = $1 AND company_id = $2',
      [id, req.user.companyId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Truck not found' });
    }
    res.json(formatTruck(rows[0]));
  } catch (err) {
    return handleDbError(res, err);
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

  if (!number || !model || !year || !plateNumber || !engineNumber || !chassisNumber || loadCapacity === undefined || loadCapacity === null) {
    return res.status(400).json({ error: 'All required truck fields must be provided' });
  }
  const validationError = firstError(
    validateNonNegative(loadCapacity, 'loadCapacity', { required: true })
  );
  if (validationError) return res.status(400).json({ error: validationError });
  if (!Number.isInteger(Number(year)) || Number(year) < 1900 || Number(year) > 2100) {
    return res.status(400).json({ error: 'سنة الصنع يجب أن تكون بين 1900 و 2100' });
  }

  const id = uuidv4();

  try {
    await db.query(
      `INSERT INTO trucks (
      id, company_id, number, model, year, plate_number, engine_number,
      chassis_number, load_capacity, driver_name
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, req.user.companyId, number, model, year, plateNumber, engineNumber, chassisNumber, loadCapacity, driverName || null]
    );
    res.status(201).json({
      id, number, model, year, plateNumber, engineNumber, chassisNumber,
      loadCapacity, driverName: driverName || null, status: 'available'
    });
  } catch (err) {
    return handleDbError(res, err, 'رقم الشاحنة أو اللوحة أو المحرك أو الشاصي موجود مسبقاً في شركتك');
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

  const validationError = firstError(
    validateEnum(status, TRUCK_STATUSES, 'status'),
    validateNonNegative(loadCapacity, 'loadCapacity')
  );
  if (validationError) return res.status(400).json({ error: validationError });
  if (year !== undefined && year !== null && (!Number.isInteger(Number(year)) || Number(year) < 1900 || Number(year) > 2100)) {
    return res.status(400).json({ error: 'سنة الصنع يجب أن تكون بين 1900 و 2100' });
  }

  try {
    const { rows } = await db.query('SELECT id FROM trucks WHERE id = $1 AND company_id = $2', [id, req.user.companyId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Truck not found' });
    }

    const updateResult = await db.query(
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
      [number ?? null, model ?? null, year ?? null, plateNumber ?? null, engineNumber ?? null,
       chassisNumber ?? null, loadCapacity ?? null, status ?? null, driverName ?? null, id, req.user.companyId]
    );
    if (updateResult.rowCount === 0) {
      return res.status(404).json({ error: 'Truck not found' });
    }
    res.json({ message: 'Truck updated successfully' });
  } catch (err) {
    return handleDbError(res, err, 'رقم الشاحنة أو اللوحة أو المحرك أو الشاصي موجود مسبقاً في شركتك');
  }
});

// Delete truck (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await db.query('SELECT id FROM trucks WHERE id = $1 AND company_id = $2', [id, req.user.companyId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Truck not found' });
    }
    await db.query('DELETE FROM trucks WHERE id = $1 AND company_id = $2', [id, req.user.companyId]);
    res.json({ message: 'Truck deleted successfully' });
  } catch (err) {
    return handleDbError(res, err);
  }
});

export default router;
