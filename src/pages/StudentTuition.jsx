import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { getLevelInfo } from '../utils/data';
import { BANK_INFO } from '../utils/roles';

import {
  HiOutlineSparkles, HiOutlineLogout, HiOutlineCheck,
  HiOutlineExclamation, HiOutlineCash, HiOutlinePhone,
  HiOutlineAcademicCap, HiOutlineCalendar, HiOutlineQrcode,
} from 'react-icons/hi';
import './StudentTuition.css';

const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
];

export default function StudentTuition() {
  const { user, logout, roleLabel } = useAuth();
  const [students] = useLocalStorage('students', []);
  const [payments] = useLocalStorage('payments', []);

  // Tìm học sinh theo tên đăng nhập
  const student = useMemo(() => {
    return students.find(s => s.name === user?.studentName) || null;
  }, [students, user]);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Tạo danh sách 12 tháng gần nhất
  const months = useMemo(() => {
    const result = [];
    let y = currentYear;
    let m = currentMonth;
    
    // 6 tháng tới (future)
    for (let i = 6; i >= 1; i--) {
      let fm = m + i;
      let fy = y;
      if (fm > 12) { fm -= 12; fy++; }
      result.push({ month: fm, year: fy, type: 'future' });
    }

    // Tháng hiện tại + 5 tháng trước
    for (let i = 0; i <= 5; i++) {
      let pm = m - i;
      let py = y;
      if (pm <= 0) { pm += 12; py--; }
      result.push({ month: pm, year: py, type: i === 0 ? 'current' : 'past' });
    }

    return result;
  }, [currentMonth, currentYear]);

  const isPaid = (month, year) => {
    if (!student) return false;
    return payments.some(p => p.studentId === student.id && p.month === month && p.year === year);
  };

  const paidMonths = months.filter(m => m.type !== 'future' && isPaid(m.month, m.year)).length;
  const unpaidMonths = months.filter(m => m.type !== 'future' && !isPaid(m.month, m.year)).length;

  const level = student ? getLevelInfo(student.level) : { name: '—', color: '#888' };

  // QR code: tạo nội dung chuyển khoản cho tháng chưa đóng gần nhất
  const nextUnpaidMonth = months.find(m => m.type !== 'future' && !isPaid(m.month, m.year));
  


  const formatMoney = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  if (!student) {
    return (
      <div className="student-page">
        <header className="student-header">
          <div className="student-header-left">
            <div className="student-header-logo"><HiOutlineSparkles /></div>
            <h2>EnglishHub</h2>
          </div>
          <button className="logout-btn" onClick={logout}>
            <HiOutlineLogout /> Đăng xuất
          </button>
        </header>
        <div className="student-body">
          <div className="empty-state" style={{ marginTop: 80 }}>
            <HiOutlineExclamation style={{ fontSize: '3rem' }} />
            <h3>Không tìm thấy thông tin học sinh</h3>
            <p>Tài khoản chưa được liên kết với hồ sơ học sinh nào.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="student-page">
      {/* Header */}
      <header className="student-header">
        <div className="student-header-left">
          <div className="student-header-logo"><HiOutlineSparkles /></div>
          <h2>EnglishHub</h2>
        </div>
        <div className="student-header-right">
          <div className="student-user-info">
            <div className="name">{user.displayName}</div>
            <div className="role">{roleLabel}</div>
          </div>
          <button className="logout-btn" onClick={logout}>
            <HiOutlineLogout /> Đăng xuất
          </button>
        </div>
      </header>

      <div className="student-body">
        {/* Student Info */}
        <div className="student-info-card">
          <div className="student-avatar-big" style={{
            background: level.color + '22', color: level.color,
          }}>
            {student.name.charAt(0)}
          </div>
          <div className="student-details">
            <h2>{student.name}</h2>
            <div className="student-meta">
              <span><HiOutlinePhone /> {student.phone}</span>
              <span><HiOutlineAcademicCap style={{ color: level.color }} /> {level.name}</span>
              <span><HiOutlineCalendar /> {student.dob}</span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="student-summary">
          <div className="summary-item" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 'var(--radius-md)' }}>
            <HiOutlineCheck className="icon" style={{ color: '#22c55e' }} />
            <div>
              <div className="count" style={{ color: '#22c55e' }}>{paidMonths}</div>
              <div className="text" style={{ color: 'var(--text-muted)' }}>Tháng đã đóng</div>
            </div>
          </div>
          <div className="summary-item" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)' }}>
            <HiOutlineExclamation className="icon" style={{ color: '#ef4444' }} />
            <div>
              <div className="count" style={{ color: '#ef4444' }}>{unpaidMonths}</div>
              <div className="text" style={{ color: 'var(--text-muted)' }}>Tháng chưa đóng</div>
            </div>
          </div>
        </div>

        {/* Payment Timeline */}
        <div className="payment-timeline">
          <h3><HiOutlineCalendar /> Tiến trình học phí</h3>
          <div className="months-grid">
            {months.map((m, i) => {
              const paid = isPaid(m.month, m.year);
              const isFuture = m.type === 'future';
              const cls = isFuture ? 'future' : paid ? 'paid' : 'unpaid';

              return (
                <div key={i} className={`month-cell ${cls}`}>
                  <div className="month-name">
                    {MONTH_NAMES[m.month - 1]} {m.year !== currentYear ? m.year : ''}
                  </div>
                  <div className="month-status">
                    {isFuture ? (
                      <>— Chưa đến</>
                    ) : paid ? (
                      <><HiOutlineCheck /> Đã đóng</>
                    ) : (
                      <><HiOutlineExclamation /> Chưa đóng</>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* QR Code Payment */}
        {nextUnpaidMonth && (
          <div className="qr-payment-card">
            <h3><HiOutlineQrcode /> Thanh toán bằng QR</h3>
            <p className="subtitle">
              Quét mã QR để chuyển khoản học phí {MONTH_NAMES[nextUnpaidMonth.month - 1]} {nextUnpaidMonth.year}
            </p>

            <div className="qr-section-layout">
              <div className="qr-wrapper">
                <img
                  src="/qr-payment.png"
                  alt="QR Code thanh toán VietQR"
                  style={{ width: 200, height: 200, objectFit: 'contain' }}
                />
              </div>

              <div className="bank-info">
                <div className="bank-info-row">
                  <span className="label">Ngân hàng</span>
                  <span className="value">{BANK_INFO.bankName}</span>
                </div>
                <div className="bank-info-row">
                  <span className="label">Số tài khoản</span>
                  <span className="value">{BANK_INFO.accountNumber}</span>
                </div>
                <div className="bank-info-row">
                  <span className="label">Chủ tài khoản</span>
                  <span className="value">{BANK_INFO.accountHolder}</span>
                </div>
                <div className="bank-info-row">
                  <span className="label">Số tiền</span>
                  <span className="value amount-highlight">{formatMoney(BANK_INFO.tuitionFee)}</span>
                </div>
              </div>
            </div>

            <div className="transfer-note">
              <div className="label">Nội dung chuyển khoản</div>
              <div className="content">{student.name} - HP {MONTH_NAMES[nextUnpaidMonth.month - 1]} {nextUnpaidMonth.year}</div>
            </div>
          </div>
        )}

        {!nextUnpaidMonth && (
          <div className="qr-payment-card">
            <h3 style={{ color: '#22c55e' }}><HiOutlineCheck /> Đã đóng đủ học phí!</h3>
            <p className="subtitle">Bạn đã đóng đầy đủ học phí. Cảm ơn bạn!</p>
          </div>
        )}
      </div>
    </div>
  );
}
