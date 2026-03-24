import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import api from '../utils/api';
import { useToast } from '../components/Toast';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlinePhone } from 'react-icons/hi';

const COLORS = ['#4f8cff', '#a855f7', '#ec4899', '#22c55e', '#f97316', '#06b6d4'];

export default function Teachers() {
  const [teachers, setTeachers, { refetch }] = useApi('/teachers');
  const [classes] = useApi('/classes');
  const [modal, setModal] = useState(null);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const addToast = useToast();

  const [form, setForm] = useState({ name: '', phone: '', specialization: '', status: 'active' });

  const openAdd = () => {
    setForm({ name: '', phone: '', specialization: '', status: 'active' });
    setModal('add');
  };

  const openEdit = (teacher) => {
    setEditingTeacher(teacher);
    setForm({ ...teacher });
    setModal('edit');
  };

  const openDelete = (teacher) => {
    setEditingTeacher(teacher);
    setModal('delete');
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    try {
      if (modal === 'add') {
        await api.post('/teachers', form);
        addToast('Thêm giáo viên thành công!');
      } else {
        await api.put(`/teachers/${editingTeacher.id}`, form);
        addToast('Cập nhật giáo viên thành công!');
      }
      setModal(null);
      refetch();
    } catch (err) { addToast('Lỗi: ' + err.message, 'error'); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/teachers/${editingTeacher.id}`);
      addToast('Đã xoá giáo viên!', 'info');
      setModal(null);
      refetch();
    } catch (err) { addToast('Lỗi: ' + err.message, 'error'); }
  };

  const getAssignedClasses = (teacherId) => classes.filter(c => c.teacherId === teacherId);

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h1>Quản lý giáo viên</h1>
        <p>Quản lý thông tin và phân công giáo viên</p>
      </div>

      <div className="toolbar">
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Tổng: <strong style={{ color: 'var(--text-primary)' }}>{teachers.length}</strong> giáo viên &nbsp;•&nbsp; 
          Đang dạy: <strong style={{ color: 'var(--accent-green)' }}>{teachers.filter(t => t.status === 'active').length}</strong>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <HiOutlinePlus /> Thêm giáo viên
        </button>
      </div>

      <div className="cards-grid">
        {teachers.map((teacher, i) => {
          const color = COLORS[i % COLORS.length];
          const assigned = getAssignedClasses(teacher.id);
          return (
            <div key={teacher.id} className="card" style={{ animation: `fadeIn 0.4s ease-out ${i * 0.05}s backwards` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div className="avatar" style={{ width: 48, height: 48, fontSize: '1.1rem', background: color + '22', color }}>
                    {teacher.name.charAt(0)}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{teacher.name}</h3>
                    <span className={`badge badge-${teacher.status}`} style={{ marginTop: 4 }}>
                      {teacher.status === 'active' ? 'Đang dạy' : 'Tạm nghỉ'}
                    </span>
                  </div>
                </div>
                <div className="actions-cell">
                  <button className="btn-icon" onClick={() => openEdit(teacher)}><HiOutlinePencil /></button>
                  <button className="btn-icon" onClick={() => openDelete(teacher)} style={{ color: 'var(--accent-red)' }}><HiOutlineTrash /></button>
                </div>
              </div>

              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <HiOutlinePhone /> {teacher.phone}
                </div>
                <div style={{ marginTop: 4 }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Chuyên môn:</strong> {teacher.specialization}
                </div>
              </div>

              {assigned.length > 0 && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>Lớp đang phụ trách:</p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {assigned.map(cls => (
                      <span key={cls.id} className={`badge badge-${cls.level}`}>{cls.name}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {teachers.length === 0 && (
        <div className="empty-state">
          <h3>Chưa có giáo viên</h3>
          <p>Nhấn "Thêm giáo viên" để thêm mới</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modal === 'add' ? 'Thêm giáo viên' : 'Chỉnh sửa giáo viên'}</h2>
              <button className="btn-icon" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="form-group">
              <label>Họ và tên *</label>
              <input className="form-input" placeholder="Nguyễn Văn A" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Điện thoại</label>
                <input className="form-input" placeholder="0987654321" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Trạng thái</label>
                <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="active">Đang dạy</option>
                  <option value="inactive">Tạm nghỉ</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Chuyên môn</label>
              <input className="form-input" placeholder="VD: Movers & Flyers" value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })} />
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
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="confirm-dialog">
              <h2 style={{ marginBottom: 16 }}>Xác nhận xoá</h2>
              <p>Bạn có chắc muốn xoá giáo viên <strong>{editingTeacher?.name}</strong>?</p>
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
