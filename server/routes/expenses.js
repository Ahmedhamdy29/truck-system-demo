import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all expenses
router.get('/', authenticateToken, async (req, res) => {
  const { truckId, type, startDate, endDate } = req.query;
  let query = 'SELECT * FROM expenses WHERE company_id = $1';
  const params = [req.user.companyId];
  if (truckId) {
    query += ' AND truck_id = $' + (params.length + 1);
    params.push(truckId);
  }
  if (type) {
    query += ' AND type = $' + (params.length + 1);
    params.push(type);
  }
  if (startDate) {
    query += ' AND date >= $' + (params.length + 1);
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND date <= $' + (params.length + 1);
    params.push(endDate);
  }
  query += ' ORDER BY date DESC';
  try {
    const { rows } = await db.query(query, params);
    const formattedExpenses = rows.map(expense => ({
      id: expense.id,
      truckId: expense.truck_id,
      type: expense.type,
      amount: expense.amount,
      currency: expense.currency || 'SAR',
      date: expense.date,
      description: expense.description,
      category: expense.category,
      receiptImage: expense.receipt_image || null,
    }));
    res.json(formattedExpenses);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Get expenses by truck
router.get('/truck/:truckId', authenticateToken, async (req, res) => {
  const { truckId } = req.params;

  try {
    const { rows } = await db.query(
      'SELECT * FROM expenses WHERE truck_id = $1 AND company_id = $2 ORDER BY date DESC',
      [truckId, req.user.companyId]
    );

    const formattedExpenses = rows.map(expense => ({
      id: expense.id,
      truckId: expense.truck_id,
      type: expense.type,
      amount: expense.amount,
      currency: expense.currency || 'SAR',
      date: expense.date,
      description: expense.description,
      category: expense.category,
      receiptImage: expense.receipt_image || null,
    }));

    res.json(formattedExpenses);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Create new expense
router.post('/', authenticateToken, async (req, res) => {
  const { truckId, type, amount, date, description, category, receiptImage } = req.body;

  // طباعة القيم للمراقبة
  // console.log('DEBUG_EXPENSE_POST', {
  //   truckId,
  //   userTruckId: req.user.truckId,
  //   type1: typeof truckId,
  //   type2: typeof req.user.truckId
  // });

  // تقييد السائق مع مرونة في المقارنة
  if (
    req.user.role === 'driver' && 
    truckId !== req.user.truckId
  ) {
    return res.status(403).json({ error: 'Access denied: not your truck' });
  }

  if (!truckId || !type || !amount || !date || !description || !category) {
    return res.status(400).json({ error: 'All required expense fields must be provided' });
  }

  const id = uuidv4();

  try {
    await db.query(
      'INSERT INTO expenses (id, company_id, truck_id, type, amount, date, description, category, receipt_image) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [id, req.user.companyId, truckId, type, amount, date, description, category, receiptImage || null]
    );

    const newExpense = {
      id,
      truckId,
      type,
      amount,
      currency: 'SAR',
      date,
      description,
      category,
      receiptImage: receiptImage || null
    };

    res.status(201).json(newExpense);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create expense', details: err.message });
  }
});

// Update expense
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { truckId, type, amount, date, description, category, receiptImage } = req.body;

  // جلب المصروف أولاً للتحقق من ملكية الشاحنة
  try {
    const { rows } = await db.query('SELECT truck_id FROM expenses WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    const expense = rows[0];

    if (req.user.role === 'driver' && expense.truck_id !== req.user.truckId) {
      return res.status(403).json({ error: 'Access denied: not your truck' });
    }
    // ... تابع التحديث كما هو ...
    await db.query(
      `UPDATE expenses SET 
       truck_id = COALESCE($1, truck_id),
       type = COALESCE($2, type),
       amount = COALESCE($3, amount),
       date = COALESCE($4, date),
       description = COALESCE($5, description),
       category = COALESCE($6, category),
       receipt_image = COALESCE($7, receipt_image),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $8`,
      [truckId, type, amount, date, description, category, receiptImage, id]
    );

    res.json({ message: 'Expense updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update expense', details: err.message });
  }
});

// Delete expense
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  // جلب المصروف أولاً للتحقق من ملكية الشاحنة
  try {
    const { rows } = await db.query('SELECT truck_id FROM expenses WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    const expense = rows[0];

    if (req.user.role === 'driver' && expense.truck_id !== req.user.truckId) {
      return res.status(403).json({ error: 'Access denied: not your truck' });
    }
    // ... تابع الحذف كما هو ...
    await db.query('DELETE FROM expenses WHERE id = $1', [id]);

    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete expense', details: err.message });
  }
});

export default router;