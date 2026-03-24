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

    const existingRef = await Payment.findOne({ referenceCode });
    if (existingRef) return res.json({ success: true, message: 'Duplicate: already processed' });

    const match = (content || '').toUpperCase().match(/EH\s+(\S+)\s+(\d{1,2})\s+(\d{4})/);
    if (!match) {
      console.log('SePay webhook: no matching code in content:', content);
      return res.json({ success: true, message: 'No payment code found' });
    }

    const [, usernameCode, monthStr, yearStr] = match;
    const month = parseInt(monthStr);
    const year = parseInt(yearStr);

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
      paidAt: transactionDate || new Date().toISOString().split('T')[0],
      referenceCode, gateway,
      paymentMethod: 'bank_transfer',
    });

    console.log(`✅ SePay: Auto-confirmed payment for ${usernameCode} - ${month}/${year}`);
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
