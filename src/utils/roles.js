// =============================================
// Role-Based Access Control Configuration
// =============================================

export const ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  ACCOUNTANT: 'accountant',
  RECEPTIONIST: 'receptionist',
  STUDENT: 'student',
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Quản trị viên',
  [ROLES.TEACHER]: 'Giáo viên',
  [ROLES.ACCOUNTANT]: 'Kế toán',
  [ROLES.RECEPTIONIST]: 'Lễ tân',
  [ROLES.STUDENT]: 'Học sinh',
};

export const ROLE_COLORS = {
  [ROLES.ADMIN]: '#a855f7',
  [ROLES.TEACHER]: '#4f8cff',
  [ROLES.ACCOUNTANT]: '#22c55e',
  [ROLES.RECEPTIONIST]: '#f97316',
  [ROLES.STUDENT]: '#ec4899',
};

// Paths mỗi role được truy cập
export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: ['/', '/students', '/classes', '/teachers', '/schedule', '/enrollment', '/tuition'],
  [ROLES.TEACHER]: ['/', '/schedule', '/classes'],
  [ROLES.ACCOUNTANT]: ['/', '/tuition', '/students'],
  [ROLES.RECEPTIONIST]: ['/', '/students', '/enrollment', '/classes'],
  [ROLES.STUDENT]: ['/my-tuition'],
};

// Tài khoản nhân viên (cố định)
export const STAFF_USERS = [
  { username: 'admin', password: 'admin123', role: ROLES.ADMIN, displayName: 'Admin' },
  { username: 'teacher', password: 'teacher123', role: ROLES.TEACHER, displayName: 'Cô Hương' },
  { username: 'accountant', password: 'acct123', role: ROLES.ACCOUNTANT, displayName: 'Kế toán Lan' },
  { username: 'receptionist', password: 'recv123', role: ROLES.RECEPTIONIST, displayName: 'Lễ tân Mai' },
];

// Thông tin ngân hàng
export const BANK_INFO = {
  bankName: 'BIDV - CN Trường Sơn',
  accountNumber: '1770314082',
  accountHolder: 'DAO LE DIEM MY',
  tuitionFee: 1500000,
};

// =============================================
// Dynamic Student Account Management
// =============================================

const STUDENT_ACCOUNTS_KEY = 'student_accounts';

// Đọc danh sách tài khoản học sinh từ localStorage
export function getStudentAccounts() {
  try {
    const data = localStorage.getItem(STUDENT_ACCOUNTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Lưu danh sách tài khoản học sinh vào localStorage
function saveStudentAccounts(accounts) {
  localStorage.setItem(STUDENT_ACCOUNTS_KEY, JSON.stringify(accounts));
}

// Bỏ dấu tiếng Việt
function removeVietnamese(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

// Tạo username: chữ đầu họ + tên đệm cuối + tên
// VD: "Nguyễn Minh Anh" → "nminhanh", "Trần Thị Thanh Hương" → "tthanhhuong"
function generateUsername(name, existingUsernames) {
  const parts = removeVietnamese(name).toLowerCase().split(/\s+/).filter(Boolean);

  let base;
  if (parts.length >= 3) {
    // Chữ đầu họ + tên đệm cuối + tên
    base = parts[0].charAt(0) + parts[parts.length - 2] + parts[parts.length - 1];
  } else if (parts.length === 2) {
    // Chữ đầu họ + tên
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

// Password chung cho tất cả học sinh
function generatePassword() {
  return 'hs123@';
}

// Tạo tài khoản cho 1 học sinh mới
export function createStudentAccount(studentId, studentName) {
  const accounts = getStudentAccounts();
  const allUsernames = new Set([
    ...STAFF_USERS.map(u => u.username),
    ...accounts.map(a => a.username),
  ]);

  const username = generateUsername(studentName, allUsernames);
  const password = generatePassword();

  const newAccount = {
    username,
    password,
    role: ROLES.STUDENT,
    displayName: studentName,
    studentName: studentName,
    studentId: studentId,
  };

  accounts.push(newAccount);
  saveStudentAccounts(accounts);

  return { username, password };
}

// Tạo tài khoản cho nhiều học sinh (import)
export function createStudentAccountsBatch(students) {
  const accounts = getStudentAccounts();
  const allUsernames = new Set([
    ...STAFF_USERS.map(u => u.username),
    ...accounts.map(a => a.username),
  ]);

  const results = [];
  for (const s of students) {
    const username = generateUsername(s.name, allUsernames);
    const password = generatePassword();
    allUsernames.add(username);

    const newAccount = {
      username,
      password,
      role: ROLES.STUDENT,
      displayName: s.name,
      studentName: s.name,
      studentId: s.id,
    };
    accounts.push(newAccount);
    results.push({ ...s, username, password });
  }

  saveStudentAccounts(accounts);
  return results;
}

// Xoá tài khoản học sinh khi xoá học sinh
export function deleteStudentAccount(studentId) {
  const accounts = getStudentAccounts();
  const filtered = accounts.filter(a => a.studentId !== studentId);
  saveStudentAccounts(filtered);
}

// Lấy tất cả users (staff + student) để hiển thị trên trang Login
export function getAllUsers() {
  return [...STAFF_USERS, ...getStudentAccounts()];
}
