export const CLASS_LEVELS = [
  { id: 'prestarter', name: 'Pre-starter', color: '#f472b6' },
  { id: 'starters', name: 'Starters', color: '#60a5fa' },
  { id: 'movers', name: 'Movers', color: '#34d399' },
  { id: 'flyers', name: 'Flyers', color: '#fbbf24' },
  { id: 'ket', name: 'KET', color: '#a78bfa' },
];

export const PAYMENT_STATUSES = [
  { id: 'paid', name: 'Đã đóng', color: '#22c55e' },
  { id: 'unpaid', name: 'Chưa đóng', color: '#ef4444' },
];

export const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
export const TIME_SLOTS = ['08:00', '09:30', '14:00', '15:30', '17:00', '18:30', '20:00'];

const generateId = () => Math.random().toString(36).substr(2, 9);

// Seed data
const SEED_STUDENTS = [
  { id: generateId(), name: 'Nguyễn Minh Anh', phone: '0912345001', dob: '2015-03-12', level: 'prestarter', status: 'active', payment: 'paid' },
  { id: generateId(), name: 'Trần Đức Bảo', phone: '0912345002', dob: '2014-07-25', level: 'starters', status: 'active', payment: 'paid' },
  { id: generateId(), name: 'Lê Thị Cẩm', phone: '0912345003', dob: '2013-11-08', level: 'movers', status: 'active', payment: 'unpaid' },
  { id: generateId(), name: 'Phạm Hoàng Duy', phone: '0912345004', dob: '2012-05-30', level: 'flyers', status: 'active', payment: 'paid' },
  { id: generateId(), name: 'Hoàng Yến Nhi', phone: '0912345005', dob: '2011-01-14', level: 'ket', status: 'active', payment: 'partial' },
  { id: generateId(), name: 'Vũ Quốc Hưng', phone: '0912345006', dob: '2015-09-20', level: 'prestarter', status: 'active', payment: 'paid' },
  { id: generateId(), name: 'Đỗ Thanh Hà', phone: '0912345007', dob: '2014-02-18', level: 'starters', status: 'active', payment: 'unpaid' },
  { id: generateId(), name: 'Ngô Phương Linh', phone: '0912345008', dob: '2013-06-05', level: 'movers', status: 'inactive', payment: 'unpaid' },
  { id: generateId(), name: 'Bùi Minh Khôi', phone: '0912345009', dob: '2012-12-25', level: 'flyers', status: 'active', payment: 'paid' },
  { id: generateId(), name: 'Đặng Tuấn Kiệt', phone: '0912345010', dob: '2011-08-11', level: 'ket', status: 'active', payment: 'paid' },
  { id: generateId(), name: 'Trương Thảo Vy', phone: '0912345011', dob: '2014-04-22', level: 'starters', status: 'active', payment: 'partial' },
  { id: generateId(), name: 'Lý Gia Hân', phone: '0912345012', dob: '2013-10-15', level: 'movers', status: 'active', payment: 'paid' },
  { id: generateId(), name: 'Mai Đình Phúc', phone: '0912345013', dob: '2012-03-28', level: 'flyers', status: 'active', payment: 'unpaid' },
  { id: generateId(), name: 'Phan Ngọc Trâm', phone: '0912345014', dob: '2015-07-09', level: 'prestarter', status: 'active', payment: 'paid' },
  { id: generateId(), name: 'Tô Quang Minh', phone: '0912345015', dob: '2011-11-30', level: 'ket', status: 'inactive', payment: 'unpaid' },
];

const SEED_TEACHERS = [
  { id: generateId(), name: 'Nguyễn Thị Hương', phone: '0987654001', specialization: 'Pre-starter & Starters', status: 'active' },
  { id: generateId(), name: 'Trần Văn Nam', phone: '0987654002', specialization: 'Movers & Flyers', status: 'active' },
  { id: generateId(), name: 'David Johnson', phone: '0987654003', specialization: 'KET & Flyers', status: 'active' },
  { id: generateId(), name: 'Sarah Williams', phone: '0987654004', specialization: 'All Levels', status: 'active' },
  { id: generateId(), name: 'Lê Minh Tuấn', phone: '0987654005', specialization: 'Starters & Movers', status: 'inactive' },
];

export function getSeedData(key) {
  if (key === 'students') return SEED_STUDENTS;
  if (key === 'teachers') return SEED_TEACHERS;
  if (key === 'classes') return generateSeedClasses();
  if (key === 'schedule') return generateSeedSchedule();
  if (key === 'enrollments') return [];
  return [];
}

function generateSeedClasses() {
  return [
    { id: generateId(), name: 'Pre-starter A', level: 'prestarter', teacherId: '', capacity: 15, room: 'P101', schedule: 'Thứ 2, Thứ 4 - 08:00' },
    { id: generateId(), name: 'Pre-starter B', level: 'prestarter', teacherId: '', capacity: 12, room: 'P102', schedule: 'Thứ 3, Thứ 5 - 09:30' },
    { id: generateId(), name: 'Starters A', level: 'starters', teacherId: '', capacity: 18, room: 'S201', schedule: 'Thứ 2, Thứ 4 - 14:00' },
    { id: generateId(), name: 'Starters B', level: 'starters', teacherId: '', capacity: 16, room: 'S202', schedule: 'Thứ 3, Thứ 5 - 15:30' },
    { id: generateId(), name: 'Movers A', level: 'movers', teacherId: '', capacity: 20, room: 'M301', schedule: 'Thứ 2, Thứ 4 - 17:00' },
    { id: generateId(), name: 'Movers B', level: 'movers', teacherId: '', capacity: 18, room: 'M302', schedule: 'Thứ 3, Thứ 5 - 18:30' },
    { id: generateId(), name: 'Flyers A', level: 'flyers', teacherId: '', capacity: 20, room: 'F401', schedule: 'Thứ 2, Thứ 6 - 17:00' },
    { id: generateId(), name: 'Flyers B', level: 'flyers', teacherId: '', capacity: 15, room: 'F402', schedule: 'Thứ 4, Thứ 7 - 09:30' },
    { id: generateId(), name: 'KET Intensive', level: 'ket', teacherId: '', capacity: 16, room: 'K501', schedule: 'Thứ 3, Thứ 5, Thứ 7 - 18:30' },
    { id: generateId(), name: 'KET Weekend', level: 'ket', teacherId: '', capacity: 14, room: 'K502', schedule: 'Thứ 7 - 08:00, 14:00' },
  ];
}

function generateSeedSchedule() {
  return [
    { id: generateId(), classId: '', day: 'Thứ 2', time: '08:00', room: 'P101', level: 'prestarter', className: 'Pre-starter A' },
    { id: generateId(), classId: '', day: 'Thứ 2', time: '14:00', room: 'S201', level: 'starters', className: 'Starters A' },
    { id: generateId(), classId: '', day: 'Thứ 2', time: '17:00', room: 'M301', level: 'movers', className: 'Movers A' },
    { id: generateId(), classId: '', day: 'Thứ 2', time: '17:00', room: 'F401', level: 'flyers', className: 'Flyers A' },
    { id: generateId(), classId: '', day: 'Thứ 3', time: '09:30', room: 'P102', level: 'prestarter', className: 'Pre-starter B' },
    { id: generateId(), classId: '', day: 'Thứ 3', time: '15:30', room: 'S202', level: 'starters', className: 'Starters B' },
    { id: generateId(), classId: '', day: 'Thứ 3', time: '18:30', room: 'M302', level: 'movers', className: 'Movers B' },
    { id: generateId(), classId: '', day: 'Thứ 3', time: '18:30', room: 'K501', level: 'ket', className: 'KET Intensive' },
    { id: generateId(), classId: '', day: 'Thứ 4', time: '08:00', room: 'P101', level: 'prestarter', className: 'Pre-starter A' },
    { id: generateId(), classId: '', day: 'Thứ 4', time: '14:00', room: 'S201', level: 'starters', className: 'Starters A' },
    { id: generateId(), classId: '', day: 'Thứ 4', time: '17:00', room: 'M301', level: 'movers', className: 'Movers A' },
    { id: generateId(), classId: '', day: 'Thứ 4', time: '09:30', room: 'F402', level: 'flyers', className: 'Flyers B' },
    { id: generateId(), classId: '', day: 'Thứ 5', time: '09:30', room: 'P102', level: 'prestarter', className: 'Pre-starter B' },
    { id: generateId(), classId: '', day: 'Thứ 5', time: '15:30', room: 'S202', level: 'starters', className: 'Starters B' },
    { id: generateId(), classId: '', day: 'Thứ 5', time: '18:30', room: 'M302', level: 'movers', className: 'Movers B' },
    { id: generateId(), classId: '', day: 'Thứ 5', time: '18:30', room: 'K501', level: 'ket', className: 'KET Intensive' },
    { id: generateId(), classId: '', day: 'Thứ 6', time: '17:00', room: 'F401', level: 'flyers', className: 'Flyers A' },
    { id: generateId(), classId: '', day: 'Thứ 7', time: '09:30', room: 'F402', level: 'flyers', className: 'Flyers B' },
    { id: generateId(), classId: '', day: 'Thứ 7', time: '08:00', room: 'K502', level: 'ket', className: 'KET Weekend' },
    { id: generateId(), classId: '', day: 'Thứ 7', time: '14:00', room: 'K502', level: 'ket', className: 'KET Weekend' },
    { id: generateId(), classId: '', day: 'Thứ 7', time: '18:30', room: 'K501', level: 'ket', className: 'KET Intensive' },
  ];
}

export function getLevelInfo(levelId) {
  return CLASS_LEVELS.find(l => l.id === levelId) || { name: levelId, color: '#888' };
}

export function getPaymentInfo(paymentId) {
  return PAYMENT_STATUSES.find(p => p.id === paymentId) || { name: paymentId, color: '#888' };
}

export { generateId };
