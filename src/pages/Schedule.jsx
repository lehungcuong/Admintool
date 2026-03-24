import { useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useToast } from '../components/Toast';
import { DAYS, TIME_SLOTS, CLASS_LEVELS, generateId } from '../utils/data';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';

export default function Schedule() {
  const [scheduleData, setScheduleData] = useLocalStorage('schedule', []);
  const [filterLevel, setFilterLevel] = useState('all');
  const [modal, setModal] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const addToast = useToast();

  const [form, setForm] = useState({ className: '', level: 'prestarter', day: 'Thứ 2', time: '08:00', room: '' });

  const filtered = filterLevel === 'all'
    ? scheduleData
    : scheduleData.filter(s => s.level === filterLevel);

  const getItems = (day, time) => filtered.filter(s => s.day === day && s.time === time);

  const openAdd = (day, time) => {
    setForm({ className: '', level: 'prestarter', day: day || 'Thứ 2', time: time || '08:00', room: '' });
    setModal('add');
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setForm({ ...item });
    setModal('edit');
  };

  const openDelete = (item) => {
    setEditingItem(item);
    setModal('delete');
  };

  const handleSave = () => {
    if (!form.className.trim()) return;
    if (modal === 'add') {
      setScheduleData(prev => [...prev, { ...form, id: generateId(), classId: '' }]);
      addToast('Thêm lịch học thành công!');
    } else {
      setScheduleData(prev => prev.map(s => s.id === editingItem.id ? { ...form, id: editingItem.id, classId: editingItem.classId || '' } : s));
      addToast('Cập nhật lịch học thành công!');
    }
    setModal(null);
  };

  const handleDelete = () => {
    setScheduleData(prev => prev.filter(s => s.id !== editingItem.id));
    addToast('Đã xoá lịch học!', 'info');
    setModal(null);
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h1>Lịch học</h1>
        <p>Thời khoá biểu các lớp trong tuần</p>
      </div>

      <div className="toolbar">
        <div className="tabs">
          <button className={`tab ${filterLevel === 'all' ? 'active' : ''}`} onClick={() => setFilterLevel('all')}>Tất cả</button>
          {CLASS_LEVELS.map(l => (
            <button key={l.id} className={`tab ${filterLevel === l.id ? 'active' : ''}`} onClick={() => setFilterLevel(l.id)}>
              <span className={`level-dot level-dot-${l.id}`}></span> {l.name}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => openAdd()}>
          <HiOutlinePlus /> Thêm lịch
        </button>
      </div>

      <div className="schedule-grid" style={{ animation: 'fadeIn 0.4s ease-out' }}>
        {/* Header */}
        <div className="schedule-header" style={{ fontWeight: 700 }}>⏰</div>
        {DAYS.map(day => (
          <div key={day} className="schedule-header">{day}</div>
        ))}

        {/* Rows */}
        {TIME_SLOTS.map(time => (
          <div key={`row-${time}`} style={{ display: 'contents' }}>
            <div className="schedule-time">{time}</div>
            {DAYS.map(day => {
              const items = getItems(day, time);
              return (
                <div
                  key={`${day}-${time}`}
                  className="schedule-cell"
                  onDoubleClick={() => openAdd(day, time)}
                  title="Double-click để thêm lịch"
                  style={{ cursor: 'cell' }}
                >
                  {items.map(item => (
                    <div key={item.id} className={`schedule-item ${item.level}`} style={{ position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontWeight: 600, flex: 1 }}>{item.className}</div>
                        <div style={{ display: 'flex', gap: 2, marginLeft: 4, flexShrink: 0 }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); openEdit(item); }}
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 2, fontSize: '0.7rem', lineHeight: 1 }}
                            title="Sửa"
                          >
                            <HiOutlinePencil />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); openDelete(item); }}
                            style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: 2, fontSize: '0.7rem', lineHeight: 1 }}
                            title="Xoá"
                          >
                            <HiOutlineTrash />
                          </button>
                        </div>
                      </div>
                      <div style={{ opacity: 0.7, marginTop: 2 }}>🏫 {item.room}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', gap: 16, marginTop: 16, padding: '12px 16px',
        background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)', flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Chú thích:</span>
        {CLASS_LEVELS.map(l => (
          <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
            <span className={`level-dot level-dot-${l.id}`}></span>
            <span style={{ color: 'var(--text-secondary)' }}>{l.name}</span>
          </div>
        ))}
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>💡 Double-click vào ô trống để thêm lịch</span>
      </div>

      {/* Add/Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modal === 'add' ? 'Thêm lịch học' : 'Chỉnh sửa lịch học'}</h2>
              <button className="btn-icon" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="form-group">
              <label>Tên lớp *</label>
              <input className="form-input" placeholder="VD: Starters A" value={form.className} onChange={e => setForm({ ...form, className: e.target.value })} />
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
                <label>Phòng học</label>
                <input className="form-input" placeholder="VD: S201" value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Ngày</label>
                <select className="form-select" value={form.day} onChange={e => setForm({ ...form, day: e.target.value })}>
                  {DAYS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Giờ</label>
                <select className="form-select" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })}>
                  {TIME_SLOTS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
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
              <p>Bạn có chắc muốn xoá lịch <strong>{editingItem?.className}</strong> ({editingItem?.day} - {editingItem?.time})?</p>
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
