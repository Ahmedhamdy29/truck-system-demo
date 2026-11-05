import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/database.js';
import { authenticateToken } from '../middleware/auth.js';
import {
  parsePagination, paginate, firstError, validateEnum, validateDate,
  validateNonNegative, handleDbError, requireCompanyTruck
} from '../middleware/validate.js';

const router = express.Router();

const formatExpense = (expense) => ({
  id: expense.id,
  truckId: expense.truck_id,
  type: expense.type,
  amount: expense.amount,
  currency: expense.currency || 'SAR',
  date: expense.date,
  description: expense.description,
  category: expense.category,
  receiptImage: expense.receipt_image || null,
});

// Get all expenses (driver: own truck only)
router.get('/', authenticateToken, async (req, res) => {
  const { truckId, type, startDate, endDate } = req.query;
  const { limit, offset } = parsePagination(req);
  let query = 'SELECT * FROM expenses WHERE company_id = $1';
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
    const err = validateEnum(type, ['fuel', 'maintenance', 'fees', 'other'], 'type');
    if (err) return res.status(400).json({ error: err });
    query += ' AND type = $' + (params.length + 1);
    params.push(type);
  }
  if (startDate) {
    const err = validateDate(startDate, 'startDate');
    if (err) return res.status(400).json({ error: err });
    query += ' AND date >= $' + (params.length + 1);
    params.push(startDate);
  }
  if (endDate) {
    const err = validateDate(endDate, 'endDate');
    if (err) return res.status(400).json({ error: err });
    query += ' AND date <= $' + (params.length + 1);
    params.push(endDate);
  }
  query += ' ORDER BY date DESC';
  query = paginate(query, params, { limit, offset });
  try {
    const { rows } = await db.query(query, params);
    res.json(rows.map(formatExpense));
  } catch (err) {
    return handleDbError(res, err);
  }
});

// Get expenses by truck (driver: own truck only)
router.get('/truck/:truckId', authenticateToken, async (req, res) => {
  const { truckId } = req.params;
  const { limit, offset } = parsePagination(req);
  if (req.user.role === 'driver' && truckId !== req.user.truckId) {
    return res.status(403).json({ error: 'Access denied: not your truck' });
  }
  try {
    let query = 'SELECT * FROM expenses WHERE truck_id = $1 AND company_id = $2 ORDER BY date DESC';
    const params = [truckId, req.user.companyId];
    query = paginate(query, params, { limit, offset });
    const { rows } = await db.query(query, params);
    res.json(rows.map(formatExpense));
  } catch (err) {
    return handleDbError(res, err);
  }
});

// Create new expense
router.post('/', authenticateToken, async (req, res) => {
  const { truckId, type, amount, date, description, category, receiptImage } = req.body;

  if (req.user.role === 'driver' && truckId !== req.user.truckId) {
    return res.status(403).json({ error: 'Access denied: not your truck' });
  }
  if (!truckId || !type || amount === undefined || amount === null || !date || !description || !category) {
    return res.status(400).json({ error: 'All required expense fields must be provided' });
  }
  const validationError = firstError(
    validateEnum(type, ['fuel', 'maintenance', 'fees', 'other'], 'type'),
    validateNonNegative(amount, 'amount', { required: true }),
    validateDate(date, 'date', { required: true })
  );
  if (validationError) return res.status(400).json({ error: validationError });

  // The truck must exist and belong to the user's company.
  const id = uuidv4();
  try {
    const truck = await requireCompanyTruck(db, res, truckId, req.user.companyId);
    if (!truck) return;

    await db.query(
      'INSERT INTO expenses (id, company_id, truck_id, type, amount, date, description, category, receipt_image) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [id, req.user.companyId, truckId, type, amount, date, description, category, receiptImage || null]
    );
    res.status(201).json({
      id, truckId, type, amount, currency: 'SAR', date, description, category,
      receiptImage: receiptImage || null
    });
  } catch (err) {
    return handleDbError(res, err);
  }
});

// Update expense — scoped to the user's company (IDOR fix).
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { truckId, type, amount, date, description, category, receiptImage } = req.body;

  const validationError = firstError(
    validateEnum(type, ['fuel', 'maintenance', 'fees', 'other'], 'type'),
    validateNonNegative(amount, 'amount'),
    validateDate(date, 'date')
  );
  if (validationError) return res.status(400).json({ error: validationError });

  try {
    const { rows } = await db.query(
      'SELECT truck_id FROM expenses WHERE id = $1 AND company_id = $2',
      [id, req.user.companyId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    const expense = rows[0];
    if (req.user.role === 'driver' && expense.truck_id !== req.user.truckId) {
      return res.status(403).json({ error: 'Access denied: not your truck' });
    }
    // A new truckId must belong to the same company (and to the driver).
    if (truckId !== undefined && truckId !== null) {
      if (req.user.role === 'driver' && truckId !== req.user.truckId) {
        return res.status(403).json({ error: 'Access denied: not your truck' });
      }
      const truck = await requireCompanyTruck(db, res, truckId, req.user.companyId);
      if (!truck) return;
    }

    const updateResult = await db.query(
      `UPDATE expenses SET
       truck_id = COALESCE($1, truck_id),
       type = COALESCE($2, type),
       amount = COALESCE($3, amount),
       date = COALESCE($4, date),
       description = COALESCE($5, description),
       category = COALESCE($6, category),
       receipt_image = COALESCE($7, receipt_image),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 AND company_id = $9`,
      [truckId ?? null, type ?? null, amount ?? null, date ?? null, description ?? null,
       category ?? null, receiptImage ?? null, id, req.user.companyId]
    );
    if (updateResult.rowCount === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json({ message: 'Expense updated successfully' });
  } catch (err) {
    return handleDbError(res, err);
  }
});

// Delete expense — scoped to the user's company (IDOR fix).
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query(
      'SELECT truck_id FROM expenses WHERE id = $1 AND company_id = $2',
      [id, req.user.companyId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    const expense = rows[0];
    if (req.user.role === 'driver' && expense.truck_id !== req.user.truckId) {
      return res.status(403).json({ error: 'Access denied: not your truck' });
    }
    const deleteResult = await db.query(
      'DELETE FROM expenses WHERE id = $1 AND company_id = $2',
      [id, req.user.companyId]
    );
    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    return handleDbError(res, err);
  }
});

export default router;
