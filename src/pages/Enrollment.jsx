import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import api from '../utils/api';
import { useToast } from '../components/Toast';
import { CLASS_LEVELS, getLevelInfo, getPaymentInfo } from '../utils/data';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineUserGroup, HiOutlineSearch } from 'react-icons/hi';

export default function Enrollment() {
  const [students] = useApi('/students');
  const [classes] = useApi('/classes');
  const [enrollments, setEnrollments, { refetch }] = useApi('/enrollments');
  const [selectedClass, setSelectedClass] = useState('');
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState('');
  const addToast = useToast();

  const selectedClassObj = classes.find(c => c.id === selectedClass);
  const enrolledStudentIds = enrollments.filter(e => e.classId === selectedClass).map(e => e.studentId);
  const enrolledStudents = students.filter(s => enrolledStudentIds.includes(s.id));

  const availableStudents = students.filter(s => {
    const notEnrolled = !enrolledStudentIds.includes(s.id);
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    return notEnrolled && matchSearch && s.status === 'active';
  });

  const handleEnroll = async (studentId) => {
    if (selectedClassObj && enrolledStudentIds.length >= selectedClassObj.capacity) {
      addToast('Lớp đã đầy!', 'error');
      return;
    }
    try {
      await api.post('/enrollments', {
        classId: selectedClass,
        studentId,
        enrolledAt: new Date().toISOString().split('T')[0],
      });
      addToast('Ghi danh thành công!');
      refetch();
    } catch (err) { addToast('Lỗi: ' + err.message, 'error'); }
  };

  const handleUnenroll = async (studentId) => {
    const enrollment = enrollments.find(e => e.classId === selectedClass && e.studentId === studentId);
    if (!enrollment) return;
    try {
      await api.delete(`/enrollments/${enrollment.id}`);
      addToast('Đã huỷ ghi danh', 'info');
      refetch();
    } catch (err) { addToast('Lỗi: ' + err.message, 'error'); }
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h1>Ghi danh</h1>
        <p>Ghi danh học sinh vào các lớp học</p>
      </div>

      <div className="toolbar">
        <div className="toolbar-actions">
          <select
            className="form-select"
            style={{ width: 280 }}
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
          >
            <option value="">-- Chọn lớp --</option>
            {CLASS_LEVELS.map(level => (
              <optgroup key={level.id} label={level.name}>
                {classes.filter(c => c.level === level.id).map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({enrollments.filter(e => e.classId === cls.id).length}/{cls.capacity})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        {selectedClass && (
          <button className="btn btn-primary" onClick={() => setModal(true)}>
            <HiOutlinePlus /> Thêm học sinh
          </button>
        )}
      </div>

      {selectedClass && selectedClassObj ? (
        <div>
          {/* Class Info */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className={`badge badge-${selectedClassObj.level}`}>{getLevelInfo(selectedClassObj.level).name}</span>
                <h3 style={{ fontSize: '1.1rem' }}>{selectedClassObj.name}</h3>
              </div>
              <div style={{ display: 'flex', gap: 20, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <span>🏫 {selectedClassObj.room || '—'}</span>
                <span>📅 {selectedClassObj.schedule || '—'}</span>
                <span><HiOutlineUserGroup style={{ verticalAlign: 'middle' }} /> {enrolledStudentIds.length}/{selectedClassObj.capacity}</span>
              </div>
            </div>
            <div style={{ marginTop: 12, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${selectedClassObj.capacity > 0 ? Math.round((enrolledStudentIds.length / selectedClassObj.capacity) * 100) : 0}%`,
                background: `linear-gradient(90deg, ${getLevelInfo(selectedClassObj.level).color}, ${getLevelInfo(selectedClassObj.level).color}88)`,
                borderRadius: 3,
                transition: 'width 0.5s ease',
              }} />
            </div>
          </div>

          {/* Enrolled Students Table */}
          <div className="table-container">
            <div className="table-header">
              <h3>Danh sách học sinh ({enrolledStudents.length})</h3>
            </div>
            {enrolledStudents.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Họ và tên</th>
                    <th>Điện thoại</th>
                    <th>Học phí</th>
                    <th>Ngày ghi danh</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {enrolledStudents.map(student => {
                    const enrollment = enrollments.find(e => e.classId === selectedClass && e.studentId === student.id);
                    const payment = getPaymentInfo(student.payment || 'unpaid');
                    return (
                      <tr key={student.id}>
                        <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="avatar" style={{
                              background: getLevelInfo(selectedClassObj.level).color + '22',
                              color: getLevelInfo(selectedClassObj.level).color
                            }}>
                              {student.name.charAt(0)}
                            </div>
                            {student.name}
                          </div>
                        </td>
                        <td>{student.phone}</td>
                        <td>
                          <span className="badge" style={{ background: payment.color + '18', color: payment.color }}>
                            {payment.id === 'paid' ? '✓ ' : payment.id === 'unpaid' ? '✕ ' : '◐ '}{payment.name}
                          </span>
                        </td>
                        <td>{enrollment?.enrolledAt || '—'}</td>
                        <td>
                          <button className="btn btn-sm btn-danger" onClick={() => handleUnenroll(student.id)}>
                            <HiOutlineTrash /> Huỷ
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <HiOutlineUserGroup style={{ fontSize: '2rem' }} />
                <h3>Chưa có học sinh</h3>
                <p>Nhấn "Thêm học sinh" để ghi danh</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <HiOutlineUserGroup style={{ fontSize: '2.5rem', color: 'var(--text-muted)', marginBottom: 12 }} />
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>Chọn lớp học</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Chọn một lớp học để xem và quản lý danh sách ghi danh</p>
        </div>
      )}

      {/* Add Student Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => { setModal(false); setSearch(''); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Thêm học sinh vào {selectedClassObj?.name}</h2>
              <button className="btn-icon" onClick={() => { setModal(false); setSearch(''); }}>✕</button>
            </div>

            <div className="search-box" style={{ marginBottom: 16 }}>
              <HiOutlineSearch />
              <input placeholder="Tìm kiếm học sinh..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div style={{ maxHeight: 350, overflowY: 'auto' }}>
              {availableStudents.length > 0 ? (
                availableStudents.map(student => {
                  const payment = getPaymentInfo(student.payment || 'unpaid');
                  return (
                    <div key={student.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 8px', borderBottom: '1px solid var(--border-color)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar" style={{
                          background: getLevelInfo(student.level).color + '22',
                          color: getLevelInfo(student.level).color,
                          width: 32, height: 32, fontSize: '0.8rem',
                        }}>
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{student.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: 8, alignItems: 'center' }}>
                            {getLevelInfo(student.level).name} • {student.phone}
                            <span style={{ color: payment.color, fontWeight: 600 }}>• {payment.name}</span>
                          </div>
                        </div>
                      </div>
                      <button className="btn btn-sm btn-primary" onClick={() => handleEnroll(student.id)}>
                        <HiOutlinePlus /> Thêm
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="empty-state" style={{ padding: 24 }}>
                  <p>Không tìm thấy học sinh phù hợp</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
