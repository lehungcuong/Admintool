import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApi } from '../hooks/useApi';
import { getLevelInfo } from '../utils/data';
import api from '../utils/api';
import { useToast } from '../components/Toast';

import {
  HiOutlineSparkles, HiOutlineLogout, HiOutlineCheck,
  HiOutlineExclamation, HiOutlineCash, HiOutlinePhone,
  HiOutlineAcademicCap, HiOutlineCalendar, HiOutlineQrcode,
  HiOutlineClipboard, HiOutlineRefresh, HiOutlineClock,
  HiOutlineBookOpen, HiOutlineLocationMarker, HiOutlineCollection,
} from 'react-icons/hi';
import './StudentTuition.css';

const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
];

const DAY_NAMES = { mon: 'Thứ 2', tue: 'Thứ 3', wed: 'Thứ 4', thu: 'Thứ 5', fri: 'Thứ 6', sat: 'Thứ 7', sun: 'CN' };
const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const VN_BANKS = [
  { code: 'mb', name: 'MB Bank', logo: 'https://api.vietqr.io/img/MB.png' },
  { code: 'vcb', name: 'Vietcombank', logo: 'https://api.vietqr.io/img/VCB.png' },
  { code: 'tcb', name: 'Techcombank', logo: 'https://api.vietqr.io/img/TCB.png' },
  { code: 'bidv', name: 'BIDV', logo: 'https://api.vietqr.io/img/BIDV.png' },
  { code: 'icb', name: 'VietinBank', logo: 'https://api.vietqr.io/img/ICB.png' },
  { code: 'acb', name: 'ACB', logo: 'https://api.vietqr.io/img/ACB.png' },
  { code: 'tpb', name: 'TPBank', logo: 'https://api.vietqr.io/img/TPB.png' },
  { code: 'vpb', name: 'VPBank', logo: 'https://api.vietqr.io/img/VPB.png' },
  { code: 'vba', name: 'Agribank', logo: 'https://api.vietqr.io/img/VBA.png' },
  { code: 'hdb', name: 'HDBank', logo: 'https://api.vietqr.io/img/HDB.png' },
  { code: 'ocb', name: 'OCB', logo: 'https://api.vietqr.io/img/OCB.png' },
  { code: 'shb', name: 'SHB', logo: 'https://api.vietqr.io/img/SHB.png' },
  { code: 'vib-2', name: 'VIB', logo: 'https://api.vietqr.io/img/VIB.png' },
  { code: 'lpb', name: 'LPBank', logo: 'https://api.vietqr.io/img/LPB.png' },
  { code: 'shbvn', name: 'Shinhan', logo: 'https://api.vietqr.io/img/SHINHANBANK.png' },
];

export default function StudentTuition() {
  const { user, logout, roleLabel } = useAuth();
  const addToast = useToast();
  const [students] = useApi('/students');
  const [payments, , { refetch: refetchPayments }] = useApi('/payments');
  const [classes] = useApi('/classes');
  const [enrollments] = useApi('/enrollments');
  const [schedules] = useApi('/schedules');
  const [teachers] = useApi('/teachers');
  const [extraFees] = useApi('/extra-fees');
  const [extraFeePayments] = useApi('/extra-fee-payments');
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('tuition');
  const [bankPicker, setBankPicker] = useState(null); // null or { ba, am, addinfo }

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

  // Extra fees for this student
  const myExtraFees = useMemo(() => {
    if (!student) return [];
    return extraFees.map(fee => {
      const payment = extraFeePayments.find(p => p.feeId === fee.id && p.studentId === student.id);
      return { ...fee, paid: payment?.paid || false };
    });
  }, [extraFees, extraFeePayments, student]);

  const formatMoney = (v) => new Intl.NumberFormat('vi-VN').format(v) + 'đ';

  const getTeacherName = (teacherId) => {
    const t = teachers.find(t => t.id === teacherId);
    return t?.name || '—';
  };

  if (!student) {
    return (
      <div className="student-page">
        <header className="student-header">
          <div className="student-header-left">
            <img src="/logo.png" alt="Logo" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: '50%', background: '#fff', padding: 2 }} />
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
          <img src="/logo.png" alt="Logo" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: '50%', background: '#fff', padding: 2 }} />
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
            {nextUnpaidMonth && paymentConfig && (() => {
              const deepLink = `https://dl.vietqr.io/pay?app=${paymentConfig.bankName.toLowerCase()}&ba=${paymentConfig.bankAccount}&am=${tuitionAmount}&addinfo=${encodeURIComponent(paymentCode)}`;
              return (
                <div style={{
                  background: 'linear-gradient(145deg, rgba(30,35,60,0.95), rgba(20,24,45,0.98))',
                  border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: 16, overflow: 'hidden',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
                }}>
                  {/* Header */}
                  <div style={{
                    padding: '16px 20px',
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(79,140,255,0.06))',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <HiOutlineCash /> Thanh toán học phí
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                        {MONTH_NAMES[nextUnpaidMonth.month - 1]} {nextUnpaidMonth.year}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#fff' }}>{formatMoney(tuitionAmount)}</div>
                      <button onClick={() => refetchPayments.call ? refetchPayments() : null}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 3, marginLeft: 'auto' }}>
                        <HiOutlineRefresh /> Kiểm tra
                      </button>
                    </div>
                  </div>

                  {/* Body: QR + Info side by side */}
                  <div style={{ padding: '20px', display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {/* QR */}
                    <div style={{ textAlign: 'center', flexShrink: 0 }}>
                      <div style={{
                        padding: 8, background: '#fff', borderRadius: 12,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                        display: 'inline-block',
                      }}>
                        <img src={qrUrl} alt="QR" style={{ width: 160, height: 160, display: 'block', borderRadius: 6 }} />
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>Quét bằng app ngân hàng</div>
                    </div>

                    {/* Bank details */}
                    <div style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[
                        { label: 'Ngân hàng', value: paymentConfig.bankName, icon: '🏦' },
                        { label: 'Số TK', value: paymentConfig.bankAccount, icon: '📋' },
                        { label: 'Chủ TK', value: paymentConfig.beneficiary, icon: '👤' },
                      ].map((r, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: '0.8rem' }}>{r.icon}</span>
                          <div>
                            <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>{r.label}</div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff' }}>{r.value}</div>
                          </div>
                        </div>
                      ))}

                      {/* Transfer content */}
                      <div style={{
                        marginTop: 4, padding: '8px 12px', borderRadius: 8,
                        background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                      }}>
                        <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 4 }}>
                          Nội dung CK
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#a5b4fc', letterSpacing: 0.5 }}>{paymentCode}</span>
                          <button onClick={() => copyToClipboard(paymentCode)}
                            style={{
                              background: 'rgba(255,255,255,0.1)', border: 'none', color: '#a5b4fc',
                              cursor: 'pointer', padding: '4px 10px', borderRadius: 6,
                              fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3,
                              transition: 'all 0.2s',
                            }}>
                            <HiOutlineClipboard /> {copied ? '✓' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ padding: '0 20px 16px', display: 'flex', gap: 10 }}>
                    <button onClick={() => setBankPicker({ ba: paymentConfig.bankAccount, am: tuitionAmount, addinfo: paymentCode })} style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      padding: '12px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff',
                      fontWeight: 700, fontSize: '0.88rem',
                      boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
                    }}>
                      🏦 Mở app ngân hàng
                    </button>
                  </div>

                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '0 20px 14px' }}>
                    Ghi đúng nội dung CK để hệ thống tự động xác nhận
                  </div>
                </div>
              );
            })()}

            {!nextUnpaidMonth && (
              <div style={{
                background: 'linear-gradient(145deg, rgba(34,197,94,0.08), rgba(20,24,45,0.95))',
                border: '1px solid rgba(34,197,94,0.2)', borderRadius: 16,
                padding: '24px', textAlign: 'center',
              }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>✓</div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#22c55e' }}>Đã đóng đủ học phí!</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Cảm ơn bạn đã đóng đầy đủ.</div>
              </div>
            )}

            {/* Extra Fees */}
            {myExtraFees.length > 0 && (
              <div className="schedule-section" style={{ marginTop: 16 }}>
                <h3><HiOutlineCollection /> Phí phát sinh</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {myExtraFees.map(fee => {
                    const shortId = fee.id.slice(-6).toUpperCase();
                    const feePayCode = user?.username ? `EH ${user.username.toUpperCase()} PHI${shortId}` : '';
                    const feeQrUrl = paymentConfig && !fee.paid
                      ? `https://qr.sepay.vn/img?acc=${paymentConfig.bankAccount}&bank=${paymentConfig.bankName}&amount=${fee.amount}&des=${encodeURIComponent(feePayCode)}`
                      : '';
                    const feeDeepLink = paymentConfig && !fee.paid
                      ? `https://dl.vietqr.io/pay?app=${paymentConfig.bankName.toLowerCase()}&ba=${paymentConfig.bankAccount}&am=${fee.amount}&addinfo=${encodeURIComponent(feePayCode)}`
                      : '';

                    if (fee.paid) {
                      return (
                        <div key={fee.id} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.15)',
                          borderRadius: 12, padding: '12px 16px',
                        }}>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{fee.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem' }}>{formatMoney(fee.amount)}</span>
                            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>✓ Đã đóng</span>
                          </div>
                        </div>
                      );
                    }

                    // Unpaid — premium compact card
                    return (
                      <div key={fee.id} style={{
                        background: 'linear-gradient(145deg, rgba(30,35,60,0.95), rgba(20,24,45,0.98))',
                        border: '1px solid rgba(239,68,68,0.15)', borderRadius: 12, overflow: 'hidden',
                      }}>
                        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>{fee.name}</div>
                            {fee.description && <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{fee.description}</div>}
                          </div>
                          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#ef4444' }}>{formatMoney(fee.amount)}</div>
                        </div>

                        {paymentConfig && (
                          <div style={{ padding: '0 16px 14px', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                            {/* Small QR */}
                            <div style={{ padding: 4, background: '#fff', borderRadius: 8, display: 'inline-block', flexShrink: 0 }}>
                              <img src={feeQrUrl} alt="QR" style={{ width: 100, height: 100, display: 'block', borderRadius: 4 }} />
                            </div>

                            <div style={{ flex: 1, minWidth: 140, display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {/* Transfer code */}
                              <div style={{
                                padding: '6px 10px', borderRadius: 6,
                                background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.15)',
                              }}>
                                <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>Nội dung CK</div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginTop: 2 }}>
                                  <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#a5b4fc', letterSpacing: 0.3 }}>{feePayCode}</span>
                                  <button onClick={() => { navigator.clipboard.writeText(feePayCode); addToast('Đã copy!'); }}
                                    style={{ background: 'none', border: 'none', color: '#a5b4fc', cursor: 'pointer', padding: 2, fontSize: '0.78rem' }}>
                                    <HiOutlineClipboard />
                                  </button>
                                </div>
                              </div>

                              {/* Bank app button */}
                              <button onClick={() => setBankPicker({ ba: paymentConfig.bankAccount, am: fee.amount, addinfo: feePayCode })} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%',
                                padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff',
                                fontWeight: 600, fontSize: '0.78rem',
                                boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
                              }}>
                                🏦 Mở app ngân hàng
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
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
                    <div className="stu-schedule-grid">
                      {mySchedule.map((sch, i) => {
                        const cls = classes.find(c => c.id === sch.classId);
                        return (
                          <div key={i} className="stu-schedule-item">
                            <div className="stu-schedule-day">{DAY_NAMES[sch.day] || sch.day}</div>
                            <div className="stu-schedule-info">
                              <div className="stu-schedule-time">{sch.time || '—'}</div>
                              <div className="stu-schedule-class">{cls?.name || '—'}</div>
                              {sch.room && <div className="stu-schedule-room"><HiOutlineLocationMarker /> {sch.room}</div>}
                              <div className="stu-schedule-teacher"><HiOutlineAcademicCap /> {getTeacherName(cls?.teacherId)}</div>
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

      {/* Contact footer */}
      <div style={{
        textAlign: 'center', padding: '20px 24px', marginTop: 32,
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>
          Cần hỗ trợ kỹ thuật hoặc có thắc mắc?
        </div>
        <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: 10 }}>
          Liên hệ Cô Đào Lê Diễm My
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <a href="tel:0964848934" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 20,
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
            color: '#22c55e', fontSize: '0.82rem', fontWeight: 600,
            textDecoration: 'none', transition: 'all 0.2s',
          }}>
            📞 0964 848 934
          </a>
          <a href="https://zalo.me/0964848934" target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 20,
            background: 'rgba(79,140,255,0.1)', border: '1px solid rgba(79,140,255,0.2)',
            color: '#4f8cff', fontSize: '0.82rem', fontWeight: 600,
            textDecoration: 'none', transition: 'all 0.2s',
          }}>
            💬 Nhắn Zalo
          </a>
        </div>
      </div>

      {/* Bank Picker Modal */}
      {bankPicker && (
        <div onClick={() => setBankPicker(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          zIndex: 9999, padding: '0 0 0',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'linear-gradient(145deg, #1e2340, #161a30)',
            borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 420,
            maxHeight: '80vh', overflow: 'auto',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
            animation: 'slideUp 0.3s ease',
          }}>
            {/* Handle bar */}
            <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '0 auto' }} />
            </div>

            <div style={{ padding: '8px 20px 12px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff', fontWeight: 700 }}>Chọn ngân hàng của bạn</h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                Chọn app ngân hàng bạn muốn mở để thanh toán
              </p>
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
              padding: '4px 16px 24px',
            }}>
              {VN_BANKS.map(bank => (
                <a
                  key={bank.code}
                  href={`https://dl.vietqr.io/pay?app=${bank.code}&ba=${bankPicker.ba}&am=${bankPicker.am}&addinfo=${encodeURIComponent(bankPicker.addinfo)}`}
                  target="_blank" rel="noopener noreferrer"
                  onClick={() => setBankPicker(null)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: '14px 6px', borderRadius: 12,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    textDecoration: 'none', cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', padding: 4,
                  }}>
                    <img src={bank.logo} alt={bank.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)', textAlign: 'center' }}>
                    {bank.name}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
