import { Router } from 'express';
import bcrypt from 'bcryptjs';
import Student from '../models/Student.js';
import User from '../models/User.js';

const router = Router();

// Helper: bỏ dấu tiếng Việt
function removeVietnamese(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

// Tạo username: chữ đầu họ + tên đệm cuối + tên
function generateUsername(name, existingUsernames) {
  const parts = removeVietnamese(name).toLowerCase().split(/\s+/).filter(Boolean);
  let base;
  if (parts.length >= 3) {
    base = parts[0].charAt(0) + parts[parts.length - 2] + parts[parts.length - 1];
  } else if (parts.length === 2) {
    base = parts[0].charAt(0) + parts[1];
  } else {
    base = parts[0] || 'hocsinh';
  }
  base = base.replace(/[^a-z0-9]/g, '');
  if (!base) base = 'hocsinh';

  let username = base;
  let counter = 1;
  while (existingUsernames.has(username)) {
    username = base + counter;
    counter++;
  }
  return username;
}

function toObj(item) {
  const obj = item.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
}

// GET all students
router.get('/', async (req, res) => {
  try {
    const items = await Student.find().sort({ createdAt: -1 });
    res.json(items.map(toObj));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET by id
router.get('/:id', async (req, res) => {
  try {
    const item = await Student.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Không tìm thấy' });
    res.json(toObj(item));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create student + auto-create account
router.post('/', async (req, res) => {
  try {
    const student = await Student.create(req.body);
    const obj = toObj(student);

    const allUsers = await User.find({}, 'username');
    const existingUsernames = new Set(allUsers.map(u => u.username));
    const username = generateUsername(student.name, existingUsernames);
    const password = 'hs123@';
    const hashedPwd = await bcrypt.hash(password, 10);

    await User.create({
      username, password: hashedPwd, role: 'student',
      displayName: student.name, studentName: student.name, studentId: student._id,
    });

    res.status(201).json({ ...obj, username, password });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// POST bulk create students + accounts
router.post('/bulk', async (req, res) => {
  try {
    const students = await Student.insertMany(req.body);
    const allUsers = await User.find({}, 'username');
    const existingUsernames = new Set(allUsers.map(u => u.username));
    const password = 'hs123@';
    const hashedPwd = await bcrypt.hash(password, 10);

    const userDocs = [];
    const results = [];

    for (const s of students) {
      const username = generateUsername(s.name, existingUsernames);
      existingUsernames.add(username);
      userDocs.push({
        username, password: hashedPwd, role: 'student',
        displayName: s.name, studentName: s.name, studentId: s._id,
      });
      results.push({ ...toObj(s), username, password });
    }

    await User.insertMany(userDocs);
    res.status(201).json(results);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// PUT update
router.put('/:id', async (req, res) => {
  try {
    const item = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ error: 'Không tìm thấy' });
    res.json(toObj(item));
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// DELETE + xóa account
router.delete('/:id', async (req, res) => {
  try {
    const item = await Student.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Không tìm thấy' });
    await User.deleteOne({ studentId: req.params.id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
