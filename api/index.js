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
  enrolledAt: { type: Date, default: Date.now },
  tuitionAmount: { type: Number, default: 500000 },
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
  month: Number, year: Number,
  amount: { type: Number, default: 0 },
  expectedAmount: { type: Number, default: 500000 },
  note: { type: String, default: '' },
  paidAt: String,
  referenceCode: String, gateway: String, paymentMethod: { type: String, default: 'manual' },
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

const extraFeeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  amount: { type: Number, required: true },
  description: { type: String, default: '' },
  appliesTo: { type: String, enum: ['all', 'level', 'class'], default: 'all' },
  targetLevel: { type: String, default: '' },
  targetClassId: { type: String, default: '' },
}, { timestamps: true });
const ExtraFee = mongoose.models.ExtraFee || mongoose.model('ExtraFee', extraFeeSchema);

const extraFeePaymentSchema = new mongoose.Schema({
  feeId: { type: String, required: true },
  studentId: { type: String, required: true },
  amount: { type: Number, default: 0 },
  paid: { type: Boolean, default: false },
}, { timestamps: true });
const ExtraFeePayment = mongoose.models.ExtraFeePayment || mongoose.model('ExtraFeePayment', extraFeePaymentSchema);

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
    const { studentId, month, year, amount, expectedAmount, note } = req.body;
    const existing = await Payment.findOne({ studentId, month, year });
    if (existing) { await Payment.deleteOne({ _id: existing._id }); return res.json({ action: 'removed' }); }
    const p = await Payment.create({ studentId, month, year, amount: amount || expectedAmount || 500000, expectedAmount: expectedAmount || 500000, note: note || '', paidAt: new Date().toISOString().split('T')[0] });
    res.json({ action: 'added', payment: toObj(p) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
paymentsRouter.put('/:id', async (req, res) => {
  try {
    const { amount, expectedAmount, note } = req.body;
    const p = await Payment.findByIdAndUpdate(req.params.id, { amount, expectedAmount, note }, { new: true });
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json(toObj(p));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// SePay Webhook (PUBLIC — no auth, verified by API key)
app.post('/api/webhook/sepay', async (req, res) => {
  try {
    const apiKey = req.headers['authorization'];
    const expectedKey = `Apikey ${process.env.SEPAY_API_KEY}`;
    if (process.env.SEPAY_API_KEY && apiKey !== expectedKey) {
      return res.status(401).json({ success: false, message: 'Invalid API Key' });
    }

    const { id, gateway, transactionDate, accountNumber, code, content, transferType, transferAmount, referenceCode } = req.body;

    // Chỉ xử lý tiền vào
    if (transferType !== 'in') return res.json({ success: true, message: 'Ignored: not incoming' });

    // Chống trùng lặp bằng referenceCode
    const existingRef = await Payment.findOne({ referenceCode });
    if (existingRef) return res.json({ success: true, message: 'Duplicate: already processed' });

    // Parse nội dung: format "EH <username> <month> <year>"
    const match = (content || '').toUpperCase().match(/EH\s+(\S+)\s+(\d{1,2})\s+(\d{4})/);
    if (!match) {
      console.log('SePay webhook: no matching code in content:', content);
      return res.json({ success: true, message: 'No payment code found' });
    }

    const [, usernameCode, monthStr, yearStr] = match;
    const month = parseInt(monthStr);
    const year = parseInt(yearStr);

    // Tìm user account bằng username
    const userAccount = await User.findOne({ username: usernameCode.toLowerCase() });
    if (!userAccount || !userAccount.studentId) {
      console.log('SePay webhook: no student found for code:', usernameCode);
      return res.json({ success: true, message: 'Student not found' });
    }

    // Kiểm tra đã đóng chưa
    const alreadyPaid = await Payment.findOne({ studentId: userAccount.studentId.toString(), month, year });
    if (alreadyPaid) return res.json({ success: true, message: 'Already paid' });

    // Tạo Payment record
    await Payment.create({
      studentId: userAccount.studentId.toString(),
      month, year,
      amount: transferAmount,
      paidAt: transactionDate || new Date().toISOString().split('T')[0],
      referenceCode,
      gateway,
      paymentMethod: 'bank_transfer',
    });

    console.log(`✅ SePay: Auto-confirmed payment for ${usernameCode} - ${month}/${year}`);
    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('SePay webhook error:', e);
    return res.status(200).json({ success: true, message: 'Error but acknowledged' });
  }
});

// Payment config (public — cho học sinh xem thông tin chuyển khoản)
app.get('/api/payment-config', (_, res) => {
  res.json({
    bankAccount: process.env.BANK_ACCOUNT || '96247L30JQ',
    bankName: process.env.BANK_NAME || 'BIDV',
    beneficiary: process.env.BANK_BENEFICIARY || 'DAO LE DIEM MY',
    tuitionAmount: parseInt(process.env.TUITION_AMOUNT || '500000'),
  });
});

app.use('/api/students', auth, studentsRouter);
app.use('/api/teachers', auth, crudRoutes(Teacher));
app.use('/api/classes', auth, crudRoutes(Class));
app.use('/api/payments', auth, paymentsRouter);
app.use('/api/enrollments', auth, crudRoutes(Enrollment));
app.use('/api/schedules', auth, crudRoutes(Schedule));
app.use('/api/extra-fees', auth, crudRoutes(ExtraFee));
app.use('/api/extra-fee-payments', auth, crudRoutes(ExtraFeePayment));

// Extra fee: bulk charge targeted students
app.post('/api/extra-fees/:feeId/charge-all', auth, async (req, res) => {
  try {
    const fee = await ExtraFee.findById(req.params.feeId);
    if (!fee) return res.status(404).json({ error: 'Fee not found' });
    let students = await Student.find({ status: 'active' });
    if (fee.appliesTo === 'level' && fee.targetLevel) {
      students = students.filter(s => s.level === fee.targetLevel);
    }
    if (fee.appliesTo === 'class' && fee.targetClassId) {
      const enrolls = await Enrollment.find({ classId: fee.targetClassId });
      const ids = new Set(enrolls.map(e => e.studentId));
      students = students.filter(s => ids.has(s._id.toString()));
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
  } catch (e) { res.status(500).json({ error: e.message }); }
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
  } catch (e) { res.status(500).json({ error: e.message }); }
});

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
