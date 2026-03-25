import { Router } from 'express';
import Payment from '../models/Payment.js';

const router = Router();

// GET all payments
router.get('/', async (req, res) => {
  try {
    const items = await Payment.find();
    const mapped = items.map(item => {
      const obj = item.toObject();
      obj.id = obj._id.toString();
      delete obj._id;
      delete obj.__v;
      return obj;
    });
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST toggle payment (add or remove)
router.post('/toggle', async (req, res) => {
  try {
    const { studentId, month, year, amount, expectedAmount, note } = req.body;
    const existing = await Payment.findOne({ studentId, month, year });

    if (existing) {
      await Payment.deleteOne({ _id: existing._id });
      res.json({ action: 'removed' });
    } else {
      const payment = await Payment.create({
        studentId, month, year,
        amount: amount || expectedAmount || 500000,
        expectedAmount: expectedAmount || 500000,
        note: note || '',
        paidAt: new Date().toISOString().split('T')[0],
      });
      const obj = payment.toObject();
      obj.id = obj._id.toString();
      delete obj._id;
      delete obj.__v;
      res.json({ action: 'added', payment: obj });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update payment (for partial payment adjustment)
router.put('/:id', async (req, res) => {
  try {
    const { amount, expectedAmount, note } = req.body;
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      { amount, expectedAmount, note },
      { new: true }
    );
    if (!payment) return res.status(404).json({ error: 'Not found' });
    const obj = payment.toObject();
    obj.id = obj._id.toString();
    delete obj._id;
    delete obj.__v;
    res.json(obj);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE a payment by id
router.delete('/:id', async (req, res) => {
  try {
    await Payment.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
