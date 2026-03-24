import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// ========== MODELS ==========
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
  displayName: String,
  studentName: String,
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
}, { timestamps: true });
const User = mongoose.models.User || mongoose.model('User', userSchema);

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: String, dob: String, level: String, status: { type: String, default: 'active' },
}, { timestamps: true });
const Student = mongoose.models.Student || mongoose.model('Student', studentSchema);

const teacherSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: String, specialization: String, status: { type: String, default: 'active' },
}, { timestamps: true });
const Teacher = mongoose.models.Teacher || mongoose.model('Teacher', teacherSchema);

const classSchema = new mongoose.Schema({
  name: { type: String, required: true },
  level: String, teacherId: String, capacity: { type: Number, default: 15 }, room: String, schedule: String,
}, { timestamps: true });
const Class = mongoose.models.Class || mongoose.model('Class', classSchema);

const paymentSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  month: Number, year: Number, amount: Number, paidAt: String,
}, { timestamps: true });
const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

const enrollmentSchema = new mongoose.Schema({
  classId: { type: String, required: true },
  studentId: { type: String, required: true },
  enrolledAt: String,
}, { timestamps: true });
const Enrollment = mongoose.models.Enrollment || mongoose.model('Enrollment', enrollmentSchema);

const scheduleSchema = new mongoose.Schema({
  className: String, level: String, day: String, time: String, room: String, classId: String,
}, { timestamps: true });
const Schedule = mongoose.models.Schedule || mongoose.model('Schedule', scheduleSchema);

// ========== HELPERS ==========
function toObj(doc) {
  const o = doc.toObject();
  o.id = o._id.toString();
  delete o._id; delete o.__v;
  return o;
}

function removeVietnamese(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

function generateUsername(name, existing) {
  const parts = removeVietnamese(name).toLowerCase().split(/\s+/).filter(Boolean);
  let base;
  if (parts.length >= 3) base = parts[0].charAt(0) + parts[parts.length - 2] + parts[parts.length - 1];
  else if (parts.length === 2) base = parts[0].charAt(0) + parts[1];
  else base = parts[0] || 'hocsinh';
  base = base.replace(/[^a-z0-9]/g, '') || 'hocsinh';
  let username = base, c = 1;
  while (existing.has(username)) { username = base + c; c++; }
  return username;
}

// ========== AUTH MIDDLEWARE ==========
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Chưa đăng nhập' });
  try {
    req.user = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Token không hợp lệ' }); }
}

// ========== CRUD FACTORY ==========
function crudRoutes(Model) {
  const r = express.Router();
  r.get('/', async (_, res) => { try { res.json((await Model.find().sort({ createdAt: -1 })).map(toObj)); } catch (e) { res.status(500).json({ error: e.message }); } });
  r.get('/:id', async (req, res) => { try { const i = await Model.findById(req.params.id); if (!i) return res.status(404).json({ error: 'Not found' }); res.json(toObj(i)); } catch (e) { res.status(500).json({ error: e.message }); } });
  r.post('/', async (req, res) => { try { res.status(201).json(toObj(await Model.create(req.body))); } catch (e) { res.status(400).json({ error: e.message }); } });
  r.put('/:id', async (req, res) => { try { const i = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true }); if (!i) return res.status(404).json({ error: 'Not found' }); res.json(toObj(i)); } catch (e) { res.status(400).json({ error: e.message }); } });
  r.delete('/:id', async (req, res) => { try { const i = await Model.findByIdAndDelete(req.params.id); if (!i) return res.status(404).json({ error: 'Not found' }); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); } });
  return r;
}

// ========== EXPRESS APP ==========
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health
app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Auth
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
    const token = jwt.sign({ id: user._id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, username: user.username, role: user.role, displayName: user.displayName, studentName: user.studentName, studentId: user.studentId } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Students (custom: auto create/delete accounts)
const studentsRouter = express.Router();
studentsRouter.get('/', async (_, res) => { try { res.json((await Student.find().sort({ createdAt: -1 })).map(toObj)); } catch (e) { res.status(500).json({ error: e.message }); } });
studentsRouter.get('/:id', async (req, res) => { try { const i = await Student.findById(req.params.id); if (!i) return res.status(404).json({ error: 'Not found' }); res.json(toObj(i)); } catch (e) { res.status(500).json({ error: e.message }); } });
studentsRouter.post('/', async (req, res) => {
  try {
    const student = await Student.create(req.body);
    const obj = toObj(student);
    const allUsers = await User.find({}, 'username');
    const existing = new Set(allUsers.map(u => u.username));
    const username = generateUsername(student.name, existing);
    const password = 'hs123@';
    await User.create({ username, password: await bcrypt.hash(password, 10), role: 'student', displayName: student.name, studentName: student.name, studentId: student._id });
    res.status(201).json({ ...obj, username, password });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
studentsRouter.post('/bulk', async (req, res) => {
  try {
    const students = await Student.insertMany(req.body);
    const allUsers = await User.find({}, 'username');
    const existing = new Set(allUsers.map(u => u.username));
    const pwd = await bcrypt.hash('hs123@', 10);
    const userDocs = [], results = [];
    for (const s of students) {
      const username = generateUsername(s.name, existing);
      existing.add(username);
      userDocs.push({ username, password: pwd, role: 'student', displayName: s.name, studentName: s.name, studentId: s._id });
      results.push({ ...toObj(s), username, password: 'hs123@' });
    }
    await User.insertMany(userDocs);
    res.status(201).json(results);
  } catch (e) { res.status(400).json({ error: e.message }); }
});
studentsRouter.put('/:id', async (req, res) => { try { const i = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true }); if (!i) return res.status(404).json({ error: 'Not found' }); res.json(toObj(i)); } catch (e) { res.status(400).json({ error: e.message }); } });
studentsRouter.delete('/:id', async (req, res) => { try { const i = await Student.findByIdAndDelete(req.params.id); if (!i) return res.status(404).json({ error: 'Not found' }); await User.deleteOne({ studentId: req.params.id }); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); } });

// Payments (custom toggle)
const paymentsRouter = express.Router();
paymentsRouter.get('/', async (_, res) => { try { res.json((await Payment.find().sort({ createdAt: -1 })).map(toObj)); } catch (e) { res.status(500).json({ error: e.message }); } });
paymentsRouter.post('/toggle', async (req, res) => {
  try {
    const { studentId, month, year } = req.body;
    const existing = await Payment.findOne({ studentId, month, year });
    if (existing) { await Payment.deleteOne({ _id: existing._id }); return res.json({ action: 'removed' }); }
    await Payment.create({ studentId, month, year, paidAt: new Date().toISOString().split('T')[0] });
    res.json({ action: 'added' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.use('/api/students', auth, studentsRouter);
app.use('/api/teachers', auth, crudRoutes(Teacher));
app.use('/api/classes', auth, crudRoutes(Class));
app.use('/api/payments', auth, paymentsRouter);
app.use('/api/enrollments', auth, crudRoutes(Enrollment));
app.use('/api/schedules', auth, crudRoutes(Schedule));

// ========== DB CONNECTION (cached for serverless) ==========
let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGODB_URI);
  isConnected = true;
}

// ========== VERCEL HANDLER ==========
export default async function handler(req, res) {
  try {
    await connectDB();
    return app(req, res);
  } catch (e) {
    console.error('Handler error:', e);
    res.status(500).json({ error: 'Server error: ' + e.message });
  }
}
