import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import api from '../utils/api';
import { useToast } from '../components/Toast';
import { CLASS_LEVELS, getLevelInfo } from '../utils/data';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineUserGroup } from 'react-icons/hi';

export default function Classes() {
  const [classes, setClasses, { refetch }] = useApi('/classes');
  const [teachers] = useApi('/teachers');
  const [enrollments] = useApi('/enrollments');
  const [activeLevel, setActiveLevel] = useState('all');
  const [modal, setModal] = useState(null);
  const [editingClass, setEditingClass] = useState(null);
  const addToast = useToast();

  const [form, setForm] = useState({ name: '', level: 'prestarter', teacherId: '', capacity: 15, room: '', schedule: '' });

  const filtered = activeLevel === 'all' ? classes : classes.filter(c => c.level === activeLevel);

  const openAdd = () => {
    setForm({ name: '', level: 'prestarter', teacherId: '', capacity: 15, room: '', schedule: '' });
    setModal('add');
  };

  const openEdit = (cls) => {
    setEditingClass(cls);
    setForm({ ...cls });
    setModal('edit');
  };

  const openDelete = (cls) => {
    setEditingClass(cls);
    setModal('delete');
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    try {
      if (modal === 'add') {
        await api.post('/classes', form);
        addToast('Thêm lớp học thành công!');
      } else {
        await api.put(`/classes/${editingClass.id}`, form);
        addToast('Cập nhật lớp học thành công!');
      }
      setModal(null);
      refetch();
    } catch (err) { addToast('Lỗi: ' + err.message, 'error'); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/classes/${editingClass.id}`);
      addToast('Đã xoá lớp học!', 'info');
      setModal(null);
      refetch();
    } catch (err) { addToast('Lỗi: ' + err.message, 'error'); }
  };

  const getTeacherName = (id) => {
    const t = teachers.find(t => t.id === id);
    return t ? t.name : 'Chưa phân công';
  };

  const getEnrollCount = (classId) => enrollments.filter(e => e.classId === classId).length;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h1>Quản lý lớp học</h1>
        <p>Quản lý các lớp theo cấp độ: Pre-starter → KET</p>
      </div>

      <div className="toolbar">
        <div className="tabs">
          <button className={`tab ${activeLevel === 'all' ? 'active' : ''}`} onClick={() => setActiveLevel('all')}>Tất cả</button>
          {CLASS_LEVELS.map(l => (
            <button key={l.id} className={`tab ${activeLevel === l.id ? 'active' : ''}`} onClick={() => setActiveLevel(l.id)}>
              {l.name}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <HiOutlinePlus /> Thêm lớp
        </button>
      </div>

      <div className="cards-grid">
        {filtered.map(cls => {
          const level = getLevelInfo(cls.level);
          const enrolled = getEnrollCount(cls.id);
          const percent = cls.capacity > 0 ? Math.round((enrolled / cls.capacity) * 100) : 0;
          return (
            <div key={cls.id} className="card" style={{ animation: 'fadeIn 0.4s ease-out backwards' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <span className={`badge badge-${cls.level}`} style={{ marginBottom: 8, display: 'inline-block' }}>{level.name}</span>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{cls.name}</h3>
                </div>
                <div className="actions-cell">
                  <button className="btn-icon" onClick={() => openEdit(cls)}><HiOutlinePencil /></button>
                  <button className="btn-icon" onClick={() => openDelete(cls)} style={{ color: 'var(--accent-red)' }}><HiOutlineTrash /></button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>👨‍🏫 Giáo viên</span>
                  <span style={{ color: 'var(--text-primary)' }}>{getTeacherName(cls.teacherId)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>🏫 Phòng</span>
                  <span style={{ color: 'var(--text-primary)' }}>{cls.room || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>📅 Lịch học</span>
                  <span style={{ color: 'var(--text-primary)' }}>{cls.schedule || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span><HiOutlineUserGroup style={{ verticalAlign: 'middle' }} /> Sĩ số</span>
                  <span style={{ color: 'var(--text-primary)' }}>{enrolled}/{cls.capacity}</span>
                </div>
              </div>

              {/* Capacity Bar */}
              <div style={{ marginTop: 12, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${percent}%`,
                  background: `linear-gradient(90deg, ${level.color}, ${level.color}88)`,
                  borderRadius: 2,
                  transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <HiOutlineUserGroup style={{ fontSize: '2rem' }} />
          <h3>Chưa có lớp học nào</h3>
          <p>Nhấn "Thêm lớp" để tạo lớp học mới</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>{modal === 'add' ? 'Thêm lớp mới' : 'Chỉnh sửa lớp'}</h2>
              <button className="btn-icon" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="form-group">
              <label>Tên lớp *</label>
              <input className="form-input" placeholder="VD: Starters C" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Cấp độ</label>
                <select className="form-select" value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}>
                  {CLASS_LEVELS.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Sĩ số tối đa</label>
                <input className="form-input" type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Phòng học</label>
                <input className="form-input" placeholder="VD: P101" value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Giáo viên</label>
                <select className="form-select" value={form.teacherId} onChange={e => setForm({ ...form, teacherId: e.target.value })}>
                  <option value="">Chưa phân công</option>
                  {teachers.filter(t => t.status === 'active').map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Lịch học</label>
              <input className="form-input" placeholder="VD: Thứ 2, Thứ 4 - 08:00" value={form.schedule} onChange={e => setForm({ ...form, schedule: e.target.value })} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Huỷ</button>
              <button className="btn btn-primary" onClick={handleSave}>{modal === 'add' ? 'Thêm' : 'Cập nhật'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {modal === 'delete' && (
        <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="modal-content" style={{ maxWidth: 400 }}>
            <div className="confirm-dialog">
              <h2 style={{ marginBottom: 16 }}>Xác nhận xoá</h2>
              <p>Bạn có chắc muốn xoá lớp <strong>{editingClass?.name}</strong>?</p>
              <div className="actions">
                <button className="btn btn-secondary" onClick={() => setModal(null)}>Huỷ</button>
                <button className="btn btn-danger" onClick={handleDelete}>Xoá</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
