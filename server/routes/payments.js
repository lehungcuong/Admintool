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
    const { studentId, month, year } = req.body;
    const existing = await Payment.findOne({ studentId, month, year });

    if (existing) {
      await Payment.deleteOne({ _id: existing._id });
      res.json({ action: 'removed' });
    } else {
      const payment = await Payment.create({
        studentId, month, year,
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
