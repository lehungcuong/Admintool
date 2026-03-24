import { useState, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useToast } from '../components/Toast';
import { CLASS_LEVELS, getLevelInfo } from '../utils/data';
import { HiOutlineCash, HiOutlineCheck, HiOutlineExclamation, HiOutlineSearch, HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi';

const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
];

export default function Tuition() {
  const [students] = useLocalStorage('students', []);
  const [payments, setPayments] = useLocalStorage('payments', []);
  const [filterLevel, setFilterLevel] = useState('all');
  const [search, setSearch] = useState('');
  const addToast = useToast();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const isFuture = selectedYear > currentYear || (selectedYear === currentYear && selectedMonth > currentMonth);

  const activeStudents = students.filter(s => s.status === 'active');

  const filtered = activeStudents.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.phone.includes(search);
    const matchLevel = filterLevel === 'all' || s.level === filterLevel;
    return matchSearch && matchLevel;
  });

  const isPaid = (studentId) => {
    return payments.some(p => p.studentId === studentId && p.month === selectedMonth && p.year === selectedYear);
  };

  const togglePayment = (studentId) => {
    if (isFuture) return;
    if (isPaid(studentId)) {
      setPayments(prev => prev.filter(p => !(p.studentId === studentId && p.month === selectedMonth && p.year === selectedYear)));
      addToast('Đã huỷ xác nhận đóng tiền');
    } else {
      setPayments(prev => [...prev, {
        studentId,
        month: selectedMonth,
        year: selectedYear,
        paidAt: new Date().toISOString().split('T')[0],
      }]);
      addToast('✓ Đã xác nhận đóng tiền!');
    }
  };

  const markAllPaid = () => {
    const unpaid = filtered.filter(s => !isPaid(s.id));
    if (unpaid.length === 0) return;
    const newPayments = unpaid.map(s => ({
      studentId: s.id,
      month: selectedMonth,
      year: selectedYear,
      paidAt: new Date().toISOString().split('T')[0],
    }));
    setPayments(prev => [...prev, ...newPayments]);
    addToast(`✓ Đã xác nhận ${unpaid.length} học sinh đóng tiền!`);
  };

  // Count overdue consecutive months from current month backwards
  const getOverdueMonths = (studentId) => {
    let count = 0;
    let y = currentYear;
    let m = currentMonth;
    for (let i = 0; i < 12; i++) {
      const paid = payments.some(p => p.studentId === studentId && p.month === m && p.year === y);
      if (paid) break;
      count++;
      m--;
      if (m === 0) { m = 12; y--; }
    }
    return count;
  };

  const paidCount = filtered.filter(s => isPaid(s.id)).length;
  const unpaidCount = filtered.length - paidCount;

  const prevMonth = () => {
    if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h1>Quản lý học phí</h1>
        <p>Theo dõi tình trạng đóng học phí hàng tháng</p>
      </div>

      {/* Month Navigator */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)', padding: '16px 24px', marginBottom: 20,
      }}>
        <button onClick={prevMonth} className="btn-icon" style={{ fontSize: '1.2rem' }}>
          <HiOutlineChevronLeft />
        </button>
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
        <button onClick={nextMonth} className="btn-icon" style={{ fontSize: '1.2rem' }}>
          <HiOutlineChevronRight />
        </button>
      </div>

      {/* Summary Bar */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20,
      }}>
        <div style={{
          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: 'var(--radius-md)', padding: '14px 18px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <HiOutlineCheck style={{ fontSize: '1.5rem', color: '#22c55e' }} />
          <div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#22c55e' }}>{paidCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Đã đóng</div>
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
          const paid = isPaid(student.id);
          const overdue = getOverdueMonths(student.id);

          return (
            <div
              key={student.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)', padding: '12px 18px',
                borderLeft: paid ? '4px solid #22c55e' : overdue >= 3 ? '4px solid #ef4444' : overdue >= 2 ? '4px solid #f97316' : '4px solid rgba(255,255,255,0.06)',
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
                  </div>
                </div>
              </div>

              {/* Overdue Warning */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {!paid && overdue >= 2 && (
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
                    background: paid ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.1)',
                    color: paid ? '#22c55e' : '#ef4444',
                    opacity: isFuture ? 0.4 : 1,
                    minWidth: 130,
                    justifyContent: 'center',
                  }}
                  title={paid ? 'Click để huỷ' : 'Click để xác nhận đóng tiền'}
                >
                  {paid ? (
                    <><HiOutlineCheck /> Đã đóng</>
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
    </div>
  );
}
