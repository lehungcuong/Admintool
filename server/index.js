import dns from 'node:dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import studentsRoutes from './routes/students.js';
import paymentsRoutes from './routes/payments.js';
import { createCrudRoutes } from './routes/crud.js';
import { auth } from './middleware/auth.js';

import Teacher from './models/Teacher.js';
import Class from './models/Class.js';
import Enrollment from './models/Enrollment.js';
import Schedule from './models/Schedule.js';
import ExtraFee from './models/ExtraFee.js';
import ExtraFeePayment from './models/ExtraFeePayment.js';

import User from './models/User.js';
import Payment from './models/Payment.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Auth routes (public)
app.use('/api/auth', authRoutes);

// SePay Webhook (PUBLIC — no auth required from app, verified by SePay API Key)
app.post('/api/webhook/sepay', async (req, res) => {
  try {
    const apiKey = req.headers['authorization'];
    const expectedKey = `Apikey ${process.env.SEPAY_API_KEY}`;
    if (process.env.SEPAY_API_KEY && apiKey !== expectedKey) {
      return res.status(401).json({ success: false, message: 'Invalid API Key' });
    }

    const { id, gateway, transactionDate, accountNumber, code, content, transferType, transferAmount, referenceCode } = req.body;

    if (transferType !== 'in') return res.json({ success: true, message: 'Ignored: not incoming' });

    const upperContent = (content || '').toUpperCase();

    // --- Pattern 1: Extra fee — EH {USERNAME} PHI{SHORTID} ---
    const feeMatch = upperContent.match(/EH\s+(\S+)\s+PHI([A-Z0-9]{6})/);
    if (feeMatch) {
      const [, usernameCode, shortId] = feeMatch;
      const userAccount = await User.findOne({ username: usernameCode.toLowerCase() });
      if (!userAccount || !userAccount.studentId) {
        return res.json({ success: true, message: 'Student not found for extra fee' });
      }

      // Find ExtraFeePayment where feeId ends with shortId (case-insensitive)
      const allFeePayments = await ExtraFeePayment.find({ studentId: userAccount.studentId.toString(), paid: false });
      const matched = allFeePayments.find(fp => fp.feeId.slice(-6).toUpperCase() === shortId);

      if (!matched) {
        return res.json({ success: true, message: 'Extra fee payment not found or already paid' });
      }

      matched.paid = true;
      await matched.save();

      console.log(`✅ SePay: Auto-confirmed extra fee for ${usernameCode} - PHI${shortId}`);
      return res.status(200).json({ success: true });
    }

    // --- Pattern 2: Tuition — EH {USERNAME} {MONTH} {YEAR} ---
    const tuitionMatch = upperContent.match(/EH\s+(\S+)\s+(\d{1,2})\s+(\d{4})/);
    if (!tuitionMatch) {
      console.log('SePay webhook: no matching code in content:', content);
      return res.json({ success: true, message: 'No payment code found' });
    }

    const [, usernameCode, monthStr, yearStr] = tuitionMatch;
    const month = parseInt(monthStr);
    const year = parseInt(yearStr);

    const existingRef = await Payment.findOne({ referenceCode });
    if (existingRef) return res.json({ success: true, message: 'Duplicate: already processed' });

    const userAccount = await User.findOne({ username: usernameCode.toLowerCase() });
    if (!userAccount || !userAccount.studentId) {
      return res.json({ success: true, message: 'Student not found' });
    }

    const alreadyPaid = await Payment.findOne({ studentId: userAccount.studentId.toString(), month, year });
    if (alreadyPaid) return res.json({ success: true, message: 'Already paid' });

    await Payment.create({
      studentId: userAccount.studentId.toString(),
      month, year,
      amount: transferAmount,
      expectedAmount: transferAmount,
      paidAt: transactionDate || new Date().toISOString().split('T')[0],
      referenceCode, gateway,
      paymentMethod: 'bank_transfer',
    });

    console.log(`✅ SePay: Auto-confirmed tuition for ${usernameCode} - ${month}/${year}`);
    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('SePay webhook error:', e);
    return res.status(200).json({ success: true, message: 'Error but acknowledged' });
  }
});

// Payment config (public)
app.get('/api/payment-config', (_, res) => {
  res.json({
    bankAccount: process.env.BANK_ACCOUNT || '96247L30JQ',
    bankName: process.env.BANK_NAME || 'BIDV',
    beneficiary: process.env.BANK_BENEFICIARY || 'DAO LE DIEM MY',
    tuitionAmount: parseInt(process.env.TUITION_AMOUNT || '500000'),
  });
});

// Protected routes
app.use('/api/students', auth, studentsRoutes);
app.use('/api/teachers', auth, createCrudRoutes(Teacher));
app.use('/api/classes', auth, createCrudRoutes(Class));
app.use('/api/payments', auth, paymentsRoutes);
app.use('/api/enrollments', auth, createCrudRoutes(Enrollment));
app.use('/api/schedules', auth, createCrudRoutes(Schedule));
app.use('/api/extra-fees', auth, createCrudRoutes(ExtraFee));
app.use('/api/extra-fee-payments', auth, createCrudRoutes(ExtraFeePayment));

// Extra fee: bulk create payments for targeted students
app.post('/api/extra-fees/:feeId/charge-all', auth, async (req, res) => {
  try {
    const fee = await ExtraFee.findById(req.params.feeId);
    if (!fee) return res.status(404).json({ error: 'Fee not found' });
    const Student = (await import('./models/Student.js')).default;
    let students = await Student.find({ status: 'active' });

    // Filter by level
    if (fee.appliesTo === 'level' && fee.targetLevel) {
      students = students.filter(s => s.level === fee.targetLevel);
    }

    // Filter by class (via enrollments)
    if (fee.appliesTo === 'class' && fee.targetClassId) {
      const enrollments = await Enrollment.find({ classId: fee.targetClassId });
      const enrolledIds = new Set(enrollments.map(e => e.studentId));
      students = students.filter(s => enrolledIds.has(s._id.toString()));
    }

    const ops = students.map(s => ({
      updateOne: {
        filter: { feeId: fee._id.toString(), studentId: s._id.toString() },
        update: { $setOnInsert: { feeId: fee._id.toString(), studentId: s._id.toString(), amount: fee.amount, paid: false } },
        upsert: true,
      }
    }));
    if (ops.length) await ExtraFeePayment.bulkWrite(ops);
    res.json({ success: true, count: students.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Toggle extra fee payment for a student
app.post('/api/extra-fee-payments/toggle', auth, async (req, res) => {
  try {
    const { feeId, studentId } = req.body;
    let rec = await ExtraFeePayment.findOne({ feeId, studentId });
    if (!rec) {
      const fee = await ExtraFee.findById(feeId);
      rec = await ExtraFeePayment.create({ feeId, studentId, amount: fee?.amount || 0, paid: true });
      return res.json({ action: 'added', item: rec });
    }
    rec.paid = !rec.paid;
    await rec.save();
    res.json({ action: rec.paid ? 'paid' : 'unpaid', item: rec });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
