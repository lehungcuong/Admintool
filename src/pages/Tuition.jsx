import { useState, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import api from '../utils/api';
import { useToast } from '../components/Toast';
import { CLASS_LEVELS, getLevelInfo } from '../utils/data';
import {
  HiOutlineCash, HiOutlineCheck, HiOutlineExclamation, HiOutlineSearch,
  HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlinePlus, HiOutlineTrash,
  HiOutlinePencil, HiOutlineCollection,
} from 'react-icons/hi';

const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
];

const formatMoney = (v) => new Intl.NumberFormat('vi-VN').format(v) + 'đ';

export default function Tuition() {
  const [students] = useApi('/students');
  const [payments, setPayments, { refetch }] = useApi('/payments');
  const [extraFees, , { refetch: refetchFees }] = useApi('/extra-fees');
  const [extraFeePayments, , { refetch: refetchEfp }] = useApi('/extra-fee-payments');
  const [classes] = useApi('/classes');
  const [enrollments] = useApi('/enrollments');
  const [filterLevel, setFilterLevel] = useState('all');
  const [search, setSearch] = useState('');
  const addToast = useToast();

  const [activeTab, setActiveTab] = useState('tuition'); // 'tuition' | 'extra'

  // === TUITION TAB STATE ===
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const isFuture = selectedYear > currentYear || (selectedYear === currentYear && selectedMonth > currentMonth);

  // Partial payment modal
  const [payModal, setPayModal] = useState(null); // { student, payment? }
  const [payForm, setPayForm] = useState({ amount: 500000, expectedAmount: 500000, note: '' });

  // Extra fee modal
  const [feeModal, setFeeModal] = useState(null); // 'add' | null
  const [feeForm, setFeeForm] = useState({ name: '', amount: 50000, description: '', appliesTo: 'all', targetLevel: '', targetClassId: '' });
  const [selectedFee, setSelectedFee] = useState(null);

  const activeStudents = students.filter(s => s.status === 'active');

  const filtered = activeStudents.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || (s.phone || '').includes(search);
    const matchLevel = filterLevel === 'all' || s.level === filterLevel;
    return matchSearch && matchLevel;
  });

  // === TUITION HELPERS ===
  const getPayment = (studentId) => {
    return payments.find(p => p.studentId === studentId && p.month === selectedMonth && p.year === selectedYear);
  };

  const isPaid = (studentId) => !!getPayment(studentId);

  const getPaymentStatus = (studentId) => {
    const p = getPayment(studentId);
    if (!p) return 'unpaid';
    if (p.amount && p.expectedAmount && p.amount < p.expectedAmount) return 'partial';
    return 'paid';
  };

  const togglePayment = async (studentId) => {
    if (isFuture) return;
    const existing = getPayment(studentId);
    if (existing) {
      // Remove payment
      try {
        await api.post('/payments/toggle', { studentId, month: selectedMonth, year: selectedYear });
        addToast('Đã huỷ xác nhận đóng tiền');
        refetch();
      } catch (err) { addToast('Lỗi: ' + err.message, 'error'); }
    } else {
      // Open partial payment modal
      const student = students.find(s => s.id === studentId);
      const expected = student?.tuitionAmount || 500000;
      setPayForm({ amount: expected, expectedAmount: expected, note: '' });
      setPayModal({ student });
    }
  };

  const handlePaySubmit = async () => {
    if (!payModal) return;
    try {
      await api.post('/payments/toggle', {
        studentId: payModal.student.id,
        month: selectedMonth,
        year: selectedYear,
        amount: payForm.amount,
        expectedAmount: payForm.expectedAmount,
        note: payForm.note,
      });
      addToast('✓ Đã xác nhận đóng tiền!');
      refetch();
      setPayModal(null);
    } catch (err) { addToast('Lỗi: ' + err.message, 'error'); }
  };

  const markAllPaid = async () => {
    const unpaid = filtered.filter(s => !isPaid(s.id));
    if (unpaid.length === 0) return;
    try {
      for (const s of unpaid) {
        const expected = s.tuitionAmount || 500000;
        await api.post('/payments/toggle', {
          studentId: s.id, month: selectedMonth, year: selectedYear,
          amount: expected, expectedAmount: expected,
        });
      }
      addToast(`✓ Đã xác nhận ${unpaid.length} học sinh đóng tiền!`);
      refetch();
    } catch (err) { addToast('Lỗi: ' + err.message, 'error'); }
  };

  const getOverdueMonths = (studentId) => {
    // Use student's enrolledAt (or createdAt) as the start date for tuition
    const student = students.find(s => s.id === studentId);
    let startMonth = currentMonth, startYear = currentYear;
    if (student) {
      const d = new Date(student.enrolledAt || student.createdAt);
      if (!isNaN(d.getTime())) {
        startMonth = d.getMonth() + 1;
        startYear = d.getFullYear();
      }
    }

    let count = 0;
    let y = currentYear;
    let m = currentMonth;
    for (let i = 0; i < 12; i++) {
      // Don't count months before student was created
      if (y < startYear || (y === startYear && m < startMonth)) break;
      const paid = payments.some(p => p.studentId === studentId && p.month === m && p.year === y);
      if (paid) break;
      count++;
      m--;
      if (m === 0) { m = 12; y--; }
    }
    return count;
  };

  const paidCount = filtered.filter(s => isPaid(s.id)).length;
  const partialCount = filtered.filter(s => getPaymentStatus(s.id) === 'partial').length;
  const unpaidCount = filtered.length - paidCount;

  const prevMonth = () => {
    if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };

  const handleCreateFee = async () => {
    if (!feeForm.name.trim() || feeForm.amount <= 0) return;
    if (feeForm.appliesTo === 'level' && !feeForm.targetLevel) return;
    if (feeForm.appliesTo === 'class' && !feeForm.targetClassId) return;
    try {
      const fee = await api.post('/extra-fees', feeForm);
      const res = await api.post(`/extra-fees/${fee.id}/charge-all`);
      const targetLabel = feeForm.appliesTo === 'all' ? 'tất cả HS' :
        feeForm.appliesTo === 'level' ? `level ${getLevelInfo(feeForm.targetLevel).name}` :
        `lớp ${classes.find(c => c.id === feeForm.targetClassId)?.name || ''}`;
      addToast(`✓ Đã tạo phí "${fee.name}" cho ${targetLabel} (${res.count} HS)!`);
      refetchFees();
      refetchEfp();
      setFeeModal(null);
      setFeeForm({ name: '', amount: 50000, description: '', appliesTo: 'all', targetLevel: '', targetClassId: '' });
    } catch (err) { addToast('Lỗi: ' + err.message, 'error'); }
  };

  const handleDeleteFee = async (feeId) => {
    try {
      // Delete all payments for this fee first
      const related = extraFeePayments.filter(p => p.feeId === feeId);
      for (const p of related) {
        await api.delete(`/extra-fee-payments/${p.id}`);
      }
      await api.delete(`/extra-fees/${feeId}`);
      addToast('Đã xoá phí phát sinh');
      refetchFees();
      refetchEfp();
      if (selectedFee === feeId) setSelectedFee(null);
    } catch (err) { addToast('Lỗi: ' + err.message, 'error'); }
  };

  const toggleExtraFeePayment = async (feeId, studentId) => {
    try {
      await api.post('/extra-fee-payments/toggle', { feeId, studentId });
      refetchEfp();
    } catch (err) { addToast('Lỗi: ' + err.message, 'error'); }
  };

  const getEfpStatus = (feeId, studentId) => {
    const rec = extraFeePayments.find(p => p.feeId === feeId && p.studentId === studentId);
    return rec?.paid || false;
  };

  // Get the target students for a fee based on its appliesTo setting
  const getTargetStudents = (fee) => {
    if (!fee) return [];
    let targets = activeStudents;
    if (fee.appliesTo === 'level' && fee.targetLevel) {
      targets = targets.filter(s => s.level === fee.targetLevel);
    } else if (fee.appliesTo === 'class' && fee.targetClassId) {
      const enrolledIds = new Set(enrollments.filter(e => e.classId === fee.targetClassId).map(e => e.studentId));
      targets = targets.filter(s => enrolledIds.has(s.id));
    }
    return targets;
  };

  const feeStudents = useMemo(() => {
    if (!selectedFee) return [];
    const fee = extraFees.find(f => f.id === selectedFee);
    return getTargetStudents(fee).filter(s => {
      const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || (s.phone || '').includes(search);
      return matchSearch;
    });
  }, [selectedFee, activeStudents, enrollments, extraFees, search]);

  const feePaidCount = selectedFee ? feeStudents.filter(s => getEfpStatus(selectedFee, s.id)).length : 0;
  const feeUnpaidCount = selectedFee ? feeStudents.length - feePaidCount : 0;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h1>Quản lý học phí</h1>
        <p>Theo dõi tình trạng đóng học phí hàng tháng & phí phát sinh</p>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex', gap: 4, background: 'var(--bg-card)', border: '1px solid var(--border-color)',
        borderRadius: 12, padding: 4, marginBottom: 20,
      }}>
        <button
          onClick={() => setActiveTab('tuition')}
          style={{
            flex: 1, padding: '10px 16px', border: 'none', borderRadius: 10,
            background: activeTab === 'tuition' ? 'linear-gradient(135deg, rgba(79,140,255,0.12), rgba(168,85,247,0.08))' : 'transparent',
            color: activeTab === 'tuition' ? 'var(--accent-blue)' : 'var(--text-muted)',
            fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <HiOutlineCash /> Học phí tháng
        </button>
        <button
          onClick={() => setActiveTab('extra')}
          style={{
            flex: 1, padding: '10px 16px', border: 'none', borderRadius: 10,
            background: activeTab === 'extra' ? 'linear-gradient(135deg, rgba(79,140,255,0.12), rgba(168,85,247,0.08))' : 'transparent',
            color: activeTab === 'extra' ? 'var(--accent-blue)' : 'var(--text-muted)',
            fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <HiOutlineCollection /> Phí phát sinh
        </button>
      </div>

      {/* ========== TAB: HỌC PHÍ THÁNG ========== */}
      {activeTab === 'tuition' && (
        <>
          {/* Month Navigator */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)', padding: '16px 24px', marginBottom: 20,
          }}>
            <button onClick={prevMonth} className="btn-icon" style={{ fontSize: '1.2rem' }}><HiOutlineChevronLeft /></button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {MONTH_NAMES[selectedMonth - 1]}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Năm {selectedYear}
                {selectedMonth === currentMonth && selectedYear === currentYear && (
                  <span style={{ marginLeft: 8, color: 'var(--accent-blue)', fontWeight: 600 }}>• Tháng hiện tại</span>
                )}
              </div>
            </div>
            <button onClick={nextMonth} className="btn-icon" style={{ fontSize: '1.2rem' }}><HiOutlineChevronRight /></button>
          </div>

          {/* Summary Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div style={{
              background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: 'var(--radius-md)', padding: '14px 18px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <HiOutlineCheck style={{ fontSize: '1.5rem', color: '#22c55e' }} />
              <div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#22c55e' }}>{paidCount}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Đã đóng {partialCount > 0 && <span style={{ color: '#f59e0b' }}>({partialCount} 1 phần)</span>}</div>
              </div>
            </div>
            <div style={{
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 'var(--radius-md)', padding: '14px 18px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <HiOutlineExclamation style={{ fontSize: '1.5rem', color: '#ef4444' }} />
              <div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ef4444' }}>{unpaidCount}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Chưa đóng</div>
              </div>
            </div>
            <div style={{
              background: 'rgba(79,140,255,0.08)', border: '1px solid rgba(79,140,255,0.2)',
              borderRadius: 'var(--radius-md)', padding: '14px 18px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <HiOutlineCash style={{ fontSize: '1.5rem', color: '#4f8cff' }} />
              <div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {filtered.length > 0 ? Math.round((paidCount / filtered.length) * 100) : 0}%
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tỷ lệ thu</div>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="toolbar">
            <div className="toolbar-actions">
              <div className="search-box">
                <HiOutlineSearch />
                <input placeholder="Tìm kiếm học sinh..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="form-select" style={{ width: 'auto' }} value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
                <option value="all">Tất cả cấp độ</option>
                {CLASS_LEVELS.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            {!isFuture && unpaidCount > 0 && (
              <button className="btn btn-primary" onClick={markAllPaid}>
                <HiOutlineCheck /> Đóng tất cả ({unpaidCount})
              </button>
            )}
          </div>

          {/* Student Payment List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(student => {
              const level = getLevelInfo(student.level);
              const status = getPaymentStatus(student.id);
              const payment = getPayment(student.id);
              const overdue = getOverdueMonths(student.id);
              const expected = student.tuitionAmount || 500000;

              return (
                <div
                  key={student.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)', padding: '12px 18px',
                    borderLeft: status === 'paid' ? '4px solid #22c55e' : status === 'partial' ? '4px solid #f59e0b' : overdue >= 3 ? '4px solid #ef4444' : overdue >= 2 ? '4px solid #f97316' : '4px solid rgba(255,255,255,0.06)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Student Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                    <div className="avatar" style={{
                      width: 36, height: 36, fontSize: '0.8rem',
                      background: level.color + '22', color: level.color,
                    }}>
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{student.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: 8, marginTop: 2 }}>
                        <span>{student.phone}</span>
                        <span>•</span>
                        <span style={{ color: level.color }}>{level.name}</span>
                        <span>•</span>
                        <span>{formatMoney(expected)}/tháng</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Partial badge */}
                    {status === 'partial' && payment && (
                      <div style={{
                        padding: '4px 10px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700,
                        background: 'rgba(245,158,11,0.12)', color: '#f59e0b',
                      }}>
                        {formatMoney(payment.amount)}/{formatMoney(payment.expectedAmount)}
                        {payment.note && <span style={{ marginLeft: 4, fontWeight: 400 }}>• {payment.note}</span>}
                      </div>
                    )}

                    {/* Overdue Warning */}
                    {status === 'unpaid' && overdue >= 2 && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '4px 10px', borderRadius: 12,
                        fontSize: '0.72rem', fontWeight: 700,
                        background: overdue >= 3 ? 'rgba(239,68,68,0.12)' : 'rgba(249,115,22,0.12)',
                        color: overdue >= 3 ? '#ef4444' : '#f97316',
                      }}>
                        <HiOutlineExclamation />
                        Nợ {overdue} tháng
                      </div>
                    )}

                    {/* Pay Button */}
                    <button
                      onClick={() => togglePayment(student.id)}
                      disabled={isFuture}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 20px', borderRadius: 'var(--radius-md)',
                        fontWeight: 600, fontSize: '0.82rem',
                        fontFamily: 'inherit', cursor: isFuture ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        border: 'none',
                        background: status === 'paid' ? 'rgba(34,197,94,0.15)' : status === 'partial' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.1)',
                        color: status === 'paid' ? '#22c55e' : status === 'partial' ? '#f59e0b' : '#ef4444',
                        opacity: isFuture ? 0.4 : 1,
                        minWidth: 130,
                        justifyContent: 'center',
                      }}
                      title={status !== 'unpaid' ? 'Click để huỷ' : 'Click để xác nhận đóng tiền'}
                    >
                      {status === 'paid' ? (
                        <><HiOutlineCheck /> Đã đóng</>
                      ) : status === 'partial' ? (
                        <><HiOutlineExclamation /> 1 phần</>
                      ) : (
                        <><HiOutlineCash /> Chưa đóng</>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="empty-state">
              <HiOutlineCash style={{ fontSize: '2rem' }} />
              <h3>Không có học sinh</h3>
              <p>Chưa có học sinh đang học để theo dõi học phí</p>
            </div>
          )}

          {/* Progress Bar */}
          {filtered.length > 0 && (
            <div style={{
              marginTop: 20, padding: '14px 18px',
              background: 'var(--bg-card)', border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                <span>Tiến độ thu học phí {MONTH_NAMES[selectedMonth - 1]}</span>
                <span style={{ fontWeight: 600 }}>{paidCount}/{filtered.length}</span>
              </div>
              <div style={{
                width: '100%', height: 8, borderRadius: 4,
                background: 'rgba(255,255,255,0.05)', overflow: 'hidden',
              }}>
                <div style={{
                  width: `${filtered.length > 0 ? (paidCount / filtered.length) * 100 : 0}%`,
                  height: '100%', borderRadius: 4,
                  background: paidCount === filtered.length ? '#22c55e' : 'linear-gradient(90deg, #4f8cff, #a855f7)',
                  transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
          )}
        </>
      )}

      {/* ========== TAB: PHÍ PHÁT SINH ========== */}
      {activeTab === 'extra' && (
        <>
          {/* Fee List + Create */}
          <div style={{
            display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center',
          }}>
            <button className="btn btn-primary" onClick={() => setFeeModal('add')}>
              <HiOutlinePlus /> Tạo phí mới
            </button>
            <div className="search-box" style={{ flex: 1, minWidth: 200 }}>
              <HiOutlineSearch />
              <input placeholder="Tìm học sinh..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {/* Fee Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginBottom: 24 }}>
            {extraFees.map(fee => {
              const targetStudents = getTargetStudents(fee);
              const fPaid = targetStudents.filter(s => getEfpStatus(fee.id, s.id)).length;
              const fTotal = targetStudents.length;
              const isSelected = selectedFee === fee.id;

              return (
                <div
                  key={fee.id}
                  onClick={() => setSelectedFee(isSelected ? null : fee.id)}
                  style={{
                    background: isSelected ? 'rgba(79,140,255,0.08)' : 'var(--bg-card)',
                    border: `1px solid ${isSelected ? 'rgba(79,140,255,0.3)' : 'var(--border-color)'}`,
                    borderRadius: 'var(--radius-md)', padding: '14px 18px',
                    cursor: 'pointer', transition: 'all 0.2s ease',
                    position: 'relative',
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, fontSize: '0.9rem' }}>
                    {fee.name}
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-blue)', marginBottom: 8 }}>
                    {formatMoney(fee.amount)}
                  </div>
                  {fee.description && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>{fee.description}</div>
                  )}
                  {/* Target badge */}
                  <div style={{ fontSize: '0.72rem', marginBottom: 8 }}>
                    {fee.appliesTo === 'all' && <span style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(79,140,255,0.1)', color: '#4f8cff' }}>Tất cả HS</span>}
                    {fee.appliesTo === 'level' && <span style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(168,85,247,0.1)', color: '#a855f7' }}>{getLevelInfo(fee.targetLevel).name}</span>}
                    {fee.appliesTo === 'class' && <span style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>Lớp {classes.find(c => c.id === fee.targetClassId)?.name || '...'}</span>}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {fPaid}/{fTotal} đã đóng
                  </div>
                  {/* Progress mini */}
                  <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div style={{ width: `${fTotal > 0 ? (fPaid / fTotal) * 100 : 0}%`, height: '100%', borderRadius: 2, background: fPaid === fTotal ? '#22c55e' : '#4f8cff', transition: 'width 0.3s' }} />
                  </div>
                  {/* Delete button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteFee(fee.id); }}
                    className="btn-icon"
                    style={{ position: 'absolute', top: 10, right: 10, color: 'var(--accent-red)', fontSize: '0.85rem' }}
                    title="Xoá phí"
                  >
                    <HiOutlineTrash />
                  </button>
                </div>
              );
            })}
          </div>

          {extraFees.length === 0 && (
            <div className="empty-state" style={{ marginBottom: 20 }}>
              <HiOutlineCollection style={{ fontSize: '2rem' }} />
              <h3>Chưa có phí phát sinh</h3>
              <p>Nhấn "Tạo phí mới" để thêm khoản phí như photo copy, dã ngoại...</p>
            </div>
          )}

          {/* Selected Fee → Student Payment List */}
          {selectedFee && (
            <div>
              <h3 style={{ marginBottom: 12, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                {extraFees.find(f => f.id === selectedFee)?.name} — Danh sách đóng phí
                <span style={{ marginLeft: 12, fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                  ({feePaidCount} đã đóng / {feeUnpaidCount} chờ)
                </span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {feeStudents.map(student => {
                  const level = getLevelInfo(student.level);
                  const paid = getEfpStatus(selectedFee, student.id);
                  return (
                    <div key={student.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)', padding: '10px 16px',
                      borderLeft: `4px solid ${paid ? '#22c55e' : 'rgba(255,255,255,0.06)'}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.75rem', background: level.color + '22', color: level.color }}>
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{student.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{student.phone}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleExtraFeePayment(selectedFee, student.id)}
                        style={{
                          padding: '6px 16px', borderRadius: 'var(--radius-sm)', border: 'none',
                          fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                          background: paid ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.1)',
                          color: paid ? '#22c55e' : '#ef4444',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        {paid ? <><HiOutlineCheck /> Đã đóng</> : <><HiOutlineCash /> Chưa đóng</>}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ========== MODALS ========== */}

      {/* Partial Payment Modal */}
      {payModal && (
        <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setPayModal(null); }}>
          <div className="modal-content" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2>💰 Xác nhận đóng tiền</h2>
              <button className="btn-icon" onClick={() => setPayModal(null)}>✕</button>
            </div>
            <div style={{ padding: '0 0 4px' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                Học sinh: <strong style={{ color: 'var(--text-primary)' }}>{payModal.student?.name}</strong>
                <br />
                {MONTH_NAMES[selectedMonth - 1]} / {selectedYear}
              </p>
              <div className="form-group">
                <label>Số tiền cần đóng (đ)</label>
                <input className="form-input" type="number" min="0" step="10000" value={payForm.expectedAmount}
                  onChange={e => {
                    const v = Number(e.target.value);
                    setPayForm(f => ({ ...f, expectedAmount: v, amount: f.amount > v ? v : f.amount }));
                  }}
                />
              </div>
              <div className="form-group">
                <label>Số tiền thực đóng (đ)</label>
                <input className="form-input" type="number" min="0" step="10000" value={payForm.amount}
                  onChange={e => setPayForm(f => ({ ...f, amount: Number(e.target.value) }))}
                />
                {payForm.amount < payForm.expectedAmount && payForm.amount > 0 && (
                  <span style={{ fontSize: '0.72rem', color: '#f59e0b', marginTop: 4, display: 'block' }}>
                    ⚠️ Đóng 1 phần — còn thiếu {formatMoney(payForm.expectedAmount - payForm.amount)}
                  </span>
                )}
              </div>
              <div className="form-group">
                <label>Ghi chú (tuỳ chọn)</label>
                <input className="form-input" placeholder="VD: Học nửa tháng, mới đăng ký..." value={payForm.note}
                  onChange={e => setPayForm(f => ({ ...f, note: e.target.value }))}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setPayModal(null)}>Huỷ</button>
              <button className="btn btn-primary" onClick={handlePaySubmit}>
                {payForm.amount < payForm.expectedAmount ? '💸 Đóng 1 phần' : '✓ Đóng đủ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {feeModal === 'add' && (
        <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setFeeModal(null); }}>
          <div className="modal-content" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2>Tạo phí phát sinh</h2>
              <button className="btn-icon" onClick={() => setFeeModal(null)}>✕</button>
            </div>
            <div className="form-group">
              <label>Tên khoản phí *</label>
              <input className="form-input" placeholder="VD: Tiền photo copy T3, Dã ngoại..." value={feeForm.name}
                onChange={e => setFeeForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Số tiền (đ) *</label>
              <input className="form-input" type="number" min="0" step="5000" value={feeForm.amount}
                onChange={e => setFeeForm(f => ({ ...f, amount: Number(e.target.value) }))}
              />
            </div>
            <div className="form-group">
              <label>Áp dụng cho *</label>
              <select className="form-select" value={feeForm.appliesTo}
                onChange={e => setFeeForm(f => ({ ...f, appliesTo: e.target.value, targetLevel: '', targetClassId: '' }))}>
                <option value="all">Tất cả học sinh</option>
                <option value="level">Theo cấp độ (Level)</option>
                <option value="class">Theo lớp</option>
              </select>
            </div>
            {feeForm.appliesTo === 'level' && (
              <div className="form-group">
                <label>Chọn cấp độ *</label>
                <select className="form-select" value={feeForm.targetLevel}
                  onChange={e => setFeeForm(f => ({ ...f, targetLevel: e.target.value }))}>
                  <option value="">— Chọn —</option>
                  {CLASS_LEVELS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            )}
            {feeForm.appliesTo === 'class' && (
              <div className="form-group">
                <label>Chọn lớp *</label>
                <select className="form-select" value={feeForm.targetClassId}
                  onChange={e => setFeeForm(f => ({ ...f, targetClassId: e.target.value }))}>
                  <option value="">— Chọn —</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div className="form-group">
              <label>Mô tả (tuỳ chọn)</label>
              <input className="form-input" placeholder="Chi tiết khoản phí..." value={feeForm.description}
                onChange={e => setFeeForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '8px 0 0' }}>
              💡 Phí sẽ tự động áp dụng cho {feeForm.appliesTo === 'all' ? 'tất cả học sinh đang học' : feeForm.appliesTo === 'level' ? `học sinh cấp ${feeForm.targetLevel ? getLevelInfo(feeForm.targetLevel).name : '...'}` : `học sinh lớp ${feeForm.targetClassId ? (classes.find(c => c.id === feeForm.targetClassId)?.name || '...') : '...'}`}.
            </p>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setFeeModal(null)}>Huỷ</button>
              <button className="btn btn-primary" onClick={handleCreateFee}>Tạo & áp dụng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
