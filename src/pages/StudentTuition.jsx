import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApi } from '../hooks/useApi';
import { getLevelInfo } from '../utils/data';
import api from '../utils/api';

import {
  HiOutlineSparkles, HiOutlineLogout, HiOutlineCheck,
  HiOutlineExclamation, HiOutlineCash, HiOutlinePhone,
  HiOutlineAcademicCap, HiOutlineCalendar, HiOutlineQrcode,
  HiOutlineClipboard, HiOutlineRefresh, HiOutlineClock,
  HiOutlineBookOpen, HiOutlineLocationMarker,
} from 'react-icons/hi';
import './StudentTuition.css';

const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
];

const DAY_NAMES = { mon: 'Thứ 2', tue: 'Thứ 3', wed: 'Thứ 4', thu: 'Thứ 5', fri: 'Thứ 6', sat: 'Thứ 7', sun: 'CN' };
const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export default function StudentTuition() {
  const { user, logout, roleLabel } = useAuth();
  const [students] = useApi('/students');
  const [payments, , { refetch: refetchPayments }] = useApi('/payments');
  const [classes] = useApi('/classes');
  const [enrollments] = useApi('/enrollments');
  const [schedules] = useApi('/schedules');
  const [teachers] = useApi('/teachers');
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('tuition'); // 'tuition' | 'schedule'

  // Lấy config thanh toán (bank info)
  useEffect(() => {
    api.get('/payment-config').then(setPaymentConfig).catch(() => {
      setPaymentConfig({
        bankAccount: '96247L30JQ',
        bankName: 'BIDV',
        beneficiary: 'DAO LE DIEM MY',
        tuitionAmount: 500000,
      });
    });
  }, []);

  // Tìm học sinh theo studentId từ JWT
  const student = useMemo(() => {
    if (!user?.studentId) return null;
    return students.find(s => s.id === user.studentId) || null;
  }, [students, user]);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Tạo danh sách tháng từ enrolledAt đến 3 tháng tới
  const months = useMemo(() => {
    if (!student) return [];
    const result = [];

    // Enrollment date (default to 6 months ago if not set)
    const enrolled = student.enrolledAt ? new Date(student.enrolledAt) : new Date(currentYear, currentMonth - 7, 1);
    const enrollMonth = enrolled.getMonth() + 1;
    const enrollYear = enrolled.getFullYear();

    // From enrollment month to current + 3 months ahead
    let y = enrollYear;
    let m = enrollMonth;
    const endY = currentMonth + 3 > 12 ? currentYear + 1 : currentYear;
    const endM = (currentMonth + 3 - 1) % 12 + 1;

    while (y < endY || (y === endY && m <= endM)) {
      const isFuture = y > currentYear || (y === currentYear && m > currentMonth);
      const isCurrent = y === currentYear && m === currentMonth;
      result.push({ month: m, year: y, type: isFuture ? 'future' : isCurrent ? 'current' : 'past' });
      m++;
      if (m > 12) { m = 1; y++; }
    }

    return result;
  }, [student, currentMonth, currentYear]);

  const isPaid = (month, year) => {
    if (!student) return false;
    return payments.some(p => p.studentId === student.id && p.month === month && p.year === year);
  };

  const paidMonths = months.filter(m => m.type !== 'future' && isPaid(m.month, m.year)).length;
  const unpaidMonths = months.filter(m => m.type !== 'future' && !isPaid(m.month, m.year)).length;

  const level = student ? getLevelInfo(student.level) : { name: '—', color: '#888' };

  // Tuition amount: student-specific or global config
  const tuitionAmount = student?.tuitionAmount || paymentConfig?.tuitionAmount || 500000;

  // QR code: tạo nội dung chuyển khoản cho tháng chưa đóng gần nhất
  const nextUnpaidMonth = months.find(m => m.type !== 'future' && !isPaid(m.month, m.year));
  const paymentCode = nextUnpaidMonth && user?.username
    ? `EH ${user.username} ${nextUnpaidMonth.month} ${nextUnpaidMonth.year}`
    : '';
  const qrUrl = paymentConfig && nextUnpaidMonth
    ? `https://qr.sepay.vn/img?acc=${paymentConfig.bankAccount}&bank=${paymentConfig.bankName}&amount=${tuitionAmount}&des=${encodeURIComponent(paymentCode)}`
    : '';

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // === Student's enrolled classes & schedule ===
  const myEnrollments = useMemo(() => {
    if (!student) return [];
    return enrollments.filter(e => e.studentId === student.id);
  }, [enrollments, student]);

  const myClasses = useMemo(() => {
    const classIds = myEnrollments.map(e => e.classId);
    return classes.filter(c => classIds.includes(c.id));
  }, [classes, myEnrollments]);

  const mySchedule = useMemo(() => {
    const classIds = myClasses.map(c => c.id);
    const items = schedules.filter(s => classIds.includes(s.classId));
    return items.sort((a, b) => {
      const dayA = DAY_ORDER.indexOf(a.day);
      const dayB = DAY_ORDER.indexOf(b.day);
      if (dayA !== dayB) return dayA - dayB;
      return (a.time || '').localeCompare(b.time || '');
    });
  }, [schedules, myClasses]);

  const getTeacherName = (teacherId) => {
    const t = teachers.find(t => t.id === teacherId);
    return t?.name || '—';
  };

  if (!student) {
    return (
      <div className="student-page">
        <header className="student-header">
          <div className="student-header-left">
            <div className="student-header-logo"><HiOutlineSparkles /></div>
            <h2>Anh Ngữ Phúc Ngôn</h2>
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
          <h2>Anh Ngữ Phúc Ngôn</h2>
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
              {student.phone && <span><HiOutlinePhone /> {student.phone}</span>}
              <span><HiOutlineAcademicCap style={{ color: level.color }} /> {level.name}</span>
              {student.dob && <span><HiOutlineCalendar /> {student.dob}</span>}
              {myClasses.length > 0 && <span><HiOutlineBookOpen /> {myClasses.map(c => c.name).join(', ')}</span>}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="student-tabs">
          <button
            className={`tab-btn ${activeTab === 'tuition' ? 'active' : ''}`}
            onClick={() => setActiveTab('tuition')}
          >
            <HiOutlineCash /> Học phí
          </button>
          <button
            className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            <HiOutlineClock /> Lịch học
          </button>
        </div>

        {/* === TAB: Học phí === */}
        {activeTab === 'tuition' && (
          <>
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
              <div className="summary-item" style={{ background: 'rgba(79,140,255,0.08)', border: '1px solid rgba(79,140,255,0.2)', borderRadius: 'var(--radius-md)' }}>
                <HiOutlineCash className="icon" style={{ color: 'var(--accent-blue)' }} />
                <div>
                  <div className="count" style={{ color: 'var(--accent-blue)' }}>{formatMoney(tuitionAmount)}</div>
                  <div className="text" style={{ color: 'var(--text-muted)' }}>Học phí / tháng</div>
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

            {/* QR Code Payment - SePay */}
            {nextUnpaidMonth && paymentConfig && (
              <div className="qr-payment-card">
                <div className="qr-payment-header">
                  <h3><HiOutlineQrcode /> Thanh toán học phí</h3>
                  <button className="refresh-btn" onClick={() => refetchPayments.call ? refetchPayments() : null} title="Kiểm tra lại">
                    <HiOutlineRefresh /> Kiểm tra
                  </button>
                </div>
                <p className="subtitle">
                  Quét mã QR để chuyển khoản học phí {MONTH_NAMES[nextUnpaidMonth.month - 1]} {nextUnpaidMonth.year}
                </p>

                <div className="qr-section-layout">
                  <div className="qr-wrapper">
                    <img
                      src={qrUrl}
                      alt="QR Code thanh toán VietQR"
                      className="qr-image"
                    />
                    <div className="qr-powered">Powered by <strong>SePay</strong> × <strong>VietQR</strong></div>
                  </div>

                  <div className="bank-info">
                    <div className="bank-info-row">
                      <span className="label">🏦 Ngân hàng</span>
                      <span className="value">{paymentConfig.bankName}</span>
                    </div>
                    <div className="bank-info-row">
                      <span className="label">📋 Số tài khoản</span>
                      <span className="value">{paymentConfig.bankAccount}</span>
                    </div>
                    <div className="bank-info-row">
                      <span className="label">👤 Chủ tài khoản</span>
                      <span className="value">{paymentConfig.beneficiary}</span>
                    </div>
                    <div className="bank-info-row highlight">
                      <span className="label">💰 Số tiền</span>
                      <span className="value amount-highlight">{formatMoney(tuitionAmount)}</span>
                    </div>
                  </div>
                </div>

                <div className="transfer-note">
                  <div className="note-label">📝 Nội dung chuyển khoản (bắt buộc)</div>
                  <div className="content-row">
                    <code className="content">{paymentCode}</code>
                    <button
                      className="copy-btn"
                      onClick={() => copyToClipboard(paymentCode)}
                    >
                      <HiOutlineClipboard /> {copied ? 'Đã copy!' : 'Copy'}
                    </button>
                  </div>
                  <p className="note-hint">
                    ⚠️ Vui lòng ghi đúng nội dung để hệ thống tự động xác nhận thanh toán
                  </p>
                </div>
              </div>
            )}

            {!nextUnpaidMonth && (
              <div className="qr-payment-card">
                <h3 style={{ color: '#22c55e' }}><HiOutlineCheck /> Đã đóng đủ học phí!</h3>
                <p className="subtitle">Bạn đã đóng đầy đủ học phí. Cảm ơn bạn!</p>
              </div>
            )}
          </>
        )}

        {/* === TAB: Lịch học === */}
        {activeTab === 'schedule' && (
          <>
            {myClasses.length === 0 ? (
              <div className="empty-state" style={{ marginTop: 40 }}>
                <HiOutlineBookOpen style={{ fontSize: '2.5rem' }} />
                <h3>Chưa đăng ký lớp</h3>
                <p>Bạn chưa được ghi danh vào lớp nào. Liên hệ trung tâm để được hỗ trợ.</p>
              </div>
            ) : (
              <>
                {/* My Classes */}
                <div className="schedule-section">
                  <h3><HiOutlineBookOpen /> Lớp đang học</h3>
                  <div className="class-cards">
                    {myClasses.map(cls => {
                      const clsLevel = getLevelInfo(cls.level);
                      return (
                        <div key={cls.id} className="class-card">
                          <div className="class-card-header">
                            <span className={`badge badge-${cls.level}`}>{clsLevel.name}</span>
                            <span className="class-name">{cls.name}</span>
                          </div>
                          <div className="class-card-body">
                            <div className="class-detail">
                              <HiOutlineAcademicCap /> GV: {getTeacherName(cls.teacherId)}
                            </div>
                            {cls.room && (
                              <div className="class-detail">
                                <HiOutlineLocationMarker /> Phòng: {cls.room}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Weekly Schedule */}
                <div className="schedule-section">
                  <h3><HiOutlineClock /> Lịch học trong tuần</h3>
                  {mySchedule.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Chưa có lịch học nào được thiết lập cho lớp của bạn.</p>
                  ) : (
                    <div className="schedule-grid">
                      {mySchedule.map((sch, i) => {
                        const cls = classes.find(c => c.id === sch.classId);
                        return (
                          <div key={i} className="schedule-item">
                            <div className="schedule-day">{DAY_NAMES[sch.day] || sch.day}</div>
                            <div className="schedule-info">
                              <div className="schedule-time">{sch.time || '—'}</div>
                              <div className="schedule-class">{cls?.name || '—'}</div>
                              {sch.room && <div className="schedule-room"><HiOutlineLocationMarker /> {sch.room}</div>}
                              <div className="schedule-teacher"><HiOutlineAcademicCap /> {getTeacherName(cls?.teacherId)}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
