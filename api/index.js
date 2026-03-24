import dns from 'node:dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

import authRoutes from '../server/routes/auth.js';
import studentsRoutes from '../server/routes/students.js';
import paymentsRoutes from '../server/routes/payments.js';
import { createCrudRoutes } from '../server/routes/crud.js';
import { auth } from '../server/middleware/auth.js';

import Teacher from '../server/models/Teacher.js';
import Class from '../server/models/Class.js';
import Enrollment from '../server/models/Enrollment.js';
import Schedule from '../server/models/Schedule.js';

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

// Connect to MongoDB (cached for serverless)
let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGODB_URI);
  isConnected = true;
  console.log('✅ Connected to MongoDB Atlas');
}

// Vercel serverless handler
export default async function handler(req, res) {
  await connectDB();
  return app(req, res);
}
