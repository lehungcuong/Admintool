import dns from 'node:dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Student from './models/Student.js';
import Teacher from './models/Teacher.js';
import Class from './models/Class.js';
import Schedule from './models/Schedule.js';

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clear existing data
  await Promise.all([
    User.deleteMany({}),
    Student.deleteMany({}),
    Teacher.deleteMany({}),
    Class.deleteMany({}),
    Schedule.deleteMany({}),
  ]);
  console.log('Cleared existing data');

  const pwd = await bcrypt.hash('admin123', 10);
  const teacherPwd = await bcrypt.hash('teacher123', 10);
  const acctPwd = await bcrypt.hash('acct123', 10);
  const recvPwd = await bcrypt.hash('recv123', 10);
  const studentPwd = await bcrypt.hash('hs123@', 10);

  // Staff accounts
  await User.insertMany([
    { username: 'admin', password: pwd, role: 'admin', displayName: 'Admin' },
    { username: 'teacher', password: teacherPwd, role: 'teacher', displayName: 'Cô Hương' },
    { username: 'accountant', password: acctPwd, role: 'accountant', displayName: 'Kế toán Lan' },
    { username: 'receptionist', password: recvPwd, role: 'receptionist', displayName: 'Lễ tân Mai' },
  ]);
  console.log('Created staff accounts');

  // Seed students
  const students = await Student.insertMany([
    { name: 'Nguyễn Minh Anh', phone: '0912345001', dob: '2015-03-12', level: 'prestarter', status: 'active' },
    { name: 'Trần Đức Bảo', phone: '0912345002', dob: '2014-07-25', level: 'starters', status: 'active' },
    { name: 'Lê Thị Cẩm', phone: '0912345003', dob: '2013-11-08', level: 'movers', status: 'active' },
    { name: 'Phạm Hoàng Duy', phone: '0912345004', dob: '2012-05-30', level: 'flyers', status: 'active' },
    { name: 'Hoàng Yến Nhi', phone: '0912345005', dob: '2011-01-14', level: 'ket', status: 'active' },
    { name: 'Vũ Quốc Hưng', phone: '0912345006', dob: '2015-09-20', level: 'prestarter', status: 'active' },
    { name: 'Đỗ Thanh Hà', phone: '0912345007', dob: '2014-02-18', level: 'starters', status: 'active' },
    { name: 'Ngô Phương Linh', phone: '0912345008', dob: '2013-06-05', level: 'movers', status: 'inactive' },
    { name: 'Bùi Minh Khôi', phone: '0912345009', dob: '2012-12-25', level: 'flyers', status: 'active' },
    { name: 'Đặng Tuấn Kiệt', phone: '0912345010', dob: '2011-08-11', level: 'ket', status: 'active' },
    { name: 'Trương Thảo Vy', phone: '0912345011', dob: '2014-04-22', level: 'starters', status: 'active' },
    { name: 'Lý Gia Hân', phone: '0912345012', dob: '2013-10-15', level: 'movers', status: 'active' },
    { name: 'Mai Đình Phúc', phone: '0912345013', dob: '2012-03-28', level: 'flyers', status: 'active' },
    { name: 'Phan Ngọc Trâm', phone: '0912345014', dob: '2015-07-09', level: 'prestarter', status: 'active' },
    { name: 'Tô Quang Minh', phone: '0912345015', dob: '2011-11-30', level: 'ket', status: 'inactive' },
  ]);
  console.log(`Created ${students.length} students`);

  // Helper bỏ dấu
  function removeVN(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  }

  // Create student accounts
  const existingUsernames = new Set(['admin', 'teacher', 'accountant', 'receptionist']);
  const studentUsers = [];
  for (const s of students) {
    const parts = removeVN(s.name).toLowerCase().split(/\s+/).filter(Boolean);
    let base;
    if (parts.length >= 3) base = parts[0].charAt(0) + parts[parts.length - 2] + parts[parts.length - 1];
    else if (parts.length === 2) base = parts[0].charAt(0) + parts[1];
    else base = parts[0] || 'hocsinh';
    base = base.replace(/[^a-z0-9]/g, '');
    let username = base;
    let counter = 1;
    while (existingUsernames.has(username)) { username = base + counter; counter++; }
    existingUsernames.add(username);

    studentUsers.push({
      username,
      password: studentPwd,
      role: 'student',
      displayName: s.name,
      studentName: s.name,
      studentId: s._id,
    });
  }
  await User.insertMany(studentUsers);
  console.log(`Created ${studentUsers.length} student accounts`);
  console.log('\nStudent accounts (password: hs123@):');
  studentUsers.forEach(u => console.log(`  ${u.displayName} → ${u.username}`));

  // Seed teachers
  const teachers = await Teacher.insertMany([
    { name: 'Nguyễn Thị Hương', phone: '0987654001', specialization: 'Pre-starter & Starters', status: 'active' },
    { name: 'Trần Văn Nam', phone: '0987654002', specialization: 'Movers & Flyers', status: 'active' },
    { name: 'David Johnson', phone: '0987654003', specialization: 'KET & Flyers', status: 'active' },
    { name: 'Sarah Williams', phone: '0987654004', specialization: 'All Levels', status: 'active' },
    { name: 'Lê Minh Tuấn', phone: '0987654005', specialization: 'Starters & Movers', status: 'inactive' },
  ]);
  console.log(`Created ${teachers.length} teachers`);

  // Seed classes
  await Class.insertMany([
    { name: 'Pre-starter A', level: 'prestarter', teacherId: '', capacity: 15, room: 'P101', schedule: 'Thứ 2, Thứ 4 - 08:00' },
    { name: 'Pre-starter B', level: 'prestarter', teacherId: '', capacity: 12, room: 'P102', schedule: 'Thứ 3, Thứ 5 - 09:30' },
    { name: 'Starters A', level: 'starters', teacherId: '', capacity: 18, room: 'S201', schedule: 'Thứ 2, Thứ 4 - 14:00' },
    { name: 'Starters B', level: 'starters', teacherId: '', capacity: 16, room: 'S202', schedule: 'Thứ 3, Thứ 5 - 15:30' },
    { name: 'Movers A', level: 'movers', teacherId: '', capacity: 20, room: 'M301', schedule: 'Thứ 2, Thứ 4 - 17:00' },
    { name: 'Movers B', level: 'movers', teacherId: '', capacity: 18, room: 'M302', schedule: 'Thứ 3, Thứ 5 - 18:30' },
    { name: 'Flyers A', level: 'flyers', teacherId: '', capacity: 20, room: 'F401', schedule: 'Thứ 2, Thứ 6 - 17:00' },
    { name: 'Flyers B', level: 'flyers', teacherId: '', capacity: 15, room: 'F402', schedule: 'Thứ 4, Thứ 7 - 09:30' },
    { name: 'KET Intensive', level: 'ket', teacherId: '', capacity: 16, room: 'K501', schedule: 'Thứ 3, Thứ 5, Thứ 7 - 18:30' },
    { name: 'KET Weekend', level: 'ket', teacherId: '', capacity: 14, room: 'K502', schedule: 'Thứ 7 - 08:00, 14:00' },
  ]);
  console.log('Created 10 classes');

  // Seed schedule
  await Schedule.insertMany([
    { day: 'Thứ 2', time: '08:00', room: 'P101', level: 'prestarter', className: 'Pre-starter A' },
    { day: 'Thứ 2', time: '14:00', room: 'S201', level: 'starters', className: 'Starters A' },
    { day: 'Thứ 2', time: '17:00', room: 'M301', level: 'movers', className: 'Movers A' },
    { day: 'Thứ 2', time: '17:00', room: 'F401', level: 'flyers', className: 'Flyers A' },
    { day: 'Thứ 3', time: '09:30', room: 'P102', level: 'prestarter', className: 'Pre-starter B' },
    { day: 'Thứ 3', time: '15:30', room: 'S202', level: 'starters', className: 'Starters B' },
    { day: 'Thứ 3', time: '18:30', room: 'M302', level: 'movers', className: 'Movers B' },
    { day: 'Thứ 3', time: '18:30', room: 'K501', level: 'ket', className: 'KET Intensive' },
    { day: 'Thứ 4', time: '08:00', room: 'P101', level: 'prestarter', className: 'Pre-starter A' },
    { day: 'Thứ 4', time: '14:00', room: 'S201', level: 'starters', className: 'Starters A' },
    { day: 'Thứ 4', time: '17:00', room: 'M301', level: 'movers', className: 'Movers A' },
    { day: 'Thứ 4', time: '09:30', room: 'F402', level: 'flyers', className: 'Flyers B' },
    { day: 'Thứ 5', time: '09:30', room: 'P102', level: 'prestarter', className: 'Pre-starter B' },
    { day: 'Thứ 5', time: '15:30', room: 'S202', level: 'starters', className: 'Starters B' },
    { day: 'Thứ 5', time: '18:30', room: 'M302', level: 'movers', className: 'Movers B' },
    { day: 'Thứ 5', time: '18:30', room: 'K501', level: 'ket', className: 'KET Intensive' },
    { day: 'Thứ 6', time: '17:00', room: 'F401', level: 'flyers', className: 'Flyers A' },
    { day: 'Thứ 7', time: '09:30', room: 'F402', level: 'flyers', className: 'Flyers B' },
    { day: 'Thứ 7', time: '08:00', room: 'K502', level: 'ket', className: 'KET Weekend' },
    { day: 'Thứ 7', time: '14:00', room: 'K502', level: 'ket', className: 'KET Weekend' },
    { day: 'Thứ 7', time: '18:30', room: 'K501', level: 'ket', className: 'KET Intensive' },
  ]);
  console.log('Created 21 schedule entries');

  console.log('\n✅ Seed complete!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
