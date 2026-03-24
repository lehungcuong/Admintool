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
