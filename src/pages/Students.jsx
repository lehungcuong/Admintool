import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useApi } from '../hooks/useApi';
import api from '../utils/api';
import { useToast } from '../components/Toast';
import { CLASS_LEVELS, getLevelInfo, getPaymentInfo } from '../utils/data';
import { HiOutlineSearch, HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineUpload, HiOutlineDownload, HiOutlineKey } from 'react-icons/hi';

// Map Vietnamese/English column names to our fields
const COLUMN_MAP = {
  'họ và tên': 'name', 'ho va ten': 'name', 'tên': 'name', 'ten': 'name', 'name': 'name', 'họ tên': 'name', 'ho ten': 'name', 'fullname': 'name', 'full name': 'name', 'student name': 'name',
  'điện thoại': 'phone', 'dien thoai': 'phone', 'phone': 'phone', 'sđt': 'phone', 'sdt': 'phone', 'số điện thoại': 'phone', 'so dien thoai': 'phone', 'tel': 'phone', 'mobile': 'phone',
  'ngày sinh': 'dob', 'ngay sinh': 'dob', 'dob': 'dob', 'date of birth': 'dob', 'birthday': 'dob', 'sinh nhật': 'dob', 'năm sinh': 'dob',
  'cấp độ': 'level', 'cap do': 'level', 'level': 'level', 'lớp': 'level', 'lop': 'level', 'class': 'level',
  'trạng thái': 'status', 'trang thai': 'status', 'status': 'status',
};

const LEVEL_MAP = {
  'pre-starter': 'prestarter', 'prestarter': 'prestarter', 'pre starter': 'prestarter',
  'starters': 'starters', 'starter': 'starters',
  'movers': 'movers', 'mover': 'movers',
  'flyers': 'flyers', 'flyer': 'flyers',
  'ket': 'ket',
};

const STATUS_MAP = {
  'đang học': 'active', 'dang hoc': 'active', 'active': 'active', 'đang': 'active',
  'tạm nghỉ': 'inactive', 'tam nghi': 'inactive', 'inactive': 'inactive', 'nghỉ': 'inactive',
};

export default function Students() {
  const [students, setStudents, { refetch }] = useApi('/students');
  const [payments] = useApi('/payments');
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [modal, setModal] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [importData, setImportData] = useState([]);
  const fileInputRef = useRef(null);
  const addToast = useToast();
  const [createdAccount, setCreatedAccount] = useState(null);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const isStudentPaidThisMonth = (studentId) => {
    return payments.some(p => p.studentId === studentId && p.month === currentMonth && p.year === currentYear);
  };

  const togglePayment = async (studentId) => {
    try {
      await api.post('/payments/toggle', { studentId, month: currentMonth, year: currentYear });
      refetch();
    } catch (err) {
      addToast('Lỗi cập nhật thanh toán: ' + err.message, 'error');
    }
  };

  const [form, setForm] = useState({ name: '', phone: '', dob: '', level: 'prestarter', status: 'active' });

  const filtered = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || (s.phone || '').includes(search);
    const matchLevel = filterLevel === 'all' || s.level === filterLevel;
    return matchSearch && matchLevel;
  });

  const openAdd = () => {
    setForm({ name: '', phone: '', dob: '', level: 'prestarter', status: 'active' });
    setModal('add');
  };

  const openEdit = (student) => {
    setEditingStudent(student);
    setForm({ ...student });
    setModal('edit');
  };

  const openDelete = (student) => {
    setEditingStudent(student);
    setModal('delete');
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    try {
      if (modal === 'add') {
        const result = await api.post('/students', form);
        setCreatedAccount({ username: result.username, password: result.password, studentName: form.name.trim() });
        setModal('account-created');
        addToast('Thêm học sinh thành công!');
      } else {
        await api.put(`/students/${editingStudent.id}`, form);
        addToast('Cập nhật học sinh thành công!');
        setModal(null);
      }
      refetch();
    } catch (err) {
      addToast('Lỗi: ' + err.message, 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/students/${editingStudent.id}`);
      addToast('Đã xoá học sinh và tài khoản!', 'info');
      setModal(null);
      refetch();
    } catch (err) {
      addToast('Lỗi: ' + err.message, 'error');
    }
  };

  // --- Excel Import ---
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (rawData.length === 0) {
          addToast('File không có dữ liệu!', 'error');
          return;
        }

        const mapped = rawData.map(row => {
          const student = { name: '', phone: '', dob: '', level: 'prestarter', status: 'active' };
          Object.entries(row).forEach(([col, val]) => {
            const key = COLUMN_MAP[col.toLowerCase().trim()];
            if (!key) return;
            const v = String(val).trim();
            if (key === 'level') {
              student.level = LEVEL_MAP[v.toLowerCase()] || 'prestarter';
            } else if (key === 'status') {
              student.status = STATUS_MAP[v.toLowerCase()] || 'active';
            } else if (key === 'dob') {
              if (typeof val === 'number') {
                const d = XLSX.SSF.parse_date_code(val);
                student.dob = `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
              } else {
                student.dob = v;
              }
            } else {
              student[key] = v;
            }
          });
          return student;
        }).filter(s => s.name.trim() !== '');

        if (mapped.length === 0) {
          addToast('Không tìm thấy dữ liệu hợp lệ!', 'error');
          return;
        }

        setImportData(mapped);
        setModal('import');
      } catch (err) {
        console.error(err);
        addToast('Lỗi đọc file Excel!', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleImportConfirm = async () => {
    try {
      await api.post('/students/bulk', importData);
      addToast(`Đã import ${importData.length} học sinh (tài khoản đã tạo tự động)!`);
      setImportData([]);
      setModal(null);
      refetch();
    } catch (err) {
      addToast('Lỗi import: ' + err.message, 'error');
    }
  };


  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h1>Quản lý học sinh</h1>
        <p>Quản lý thông tin học sinh trung tâm</p>
      </div>

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
        <div className="toolbar-actions">
          <a href="/template_hoc_sinh.xlsx" download="template_hoc_sinh.xlsx" className="btn btn-secondary" title="Tải file Excel mẫu">
            <HiOutlineDownload /> File mẫu
          </a>
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
            <HiOutlineUpload /> Import Excel
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          <button className="btn btn-primary" onClick={openAdd}>
            <HiOutlinePlus /> Thêm học sinh
          </button>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Họ và tên</th>
              <th>Điện thoại</th>
              <th>Ngày sinh</th>
              <th>Cấp độ</th>
              <th>Trạng thái</th>
              <th>Học phí (T{currentMonth})</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(student => {
              const level = getLevelInfo(student.level);
              const isPaid = isStudentPaidThisMonth(student.id);
              return (
                <tr key={student.id}>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar" style={{ background: level.color + '22', color: level.color }}>
                        {student.name.charAt(0)}
                      </div>
                      {student.name}
                    </div>
                  </td>
                  <td>{student.phone}</td>
                  <td>{student.dob}</td>
                  <td><span className={`badge badge-${student.level}`}>{level.name}</span></td>
                  <td><span className={`badge badge-${student.status}`}>{student.status === 'active' ? 'Đang học' : 'Tạm nghỉ'}</span></td>
                  <td>
                    <button
                      onClick={() => togglePayment(student.id)}
                      className="badge"
                      style={{
                        background: isPaid ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                        color: isPaid ? '#22c55e' : '#ef4444',
                        border: `1px solid ${isPaid ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontFamily: 'inherit',
                      }}
                      title={isPaid ? 'Click để chuyển thành Chưa đóng' : 'Click để xác nhận Đã đóng'}
                    >
                      {isPaid ? '✓ Đã đóng' : '✕ Chưa đóng'}
                    </button>
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button className="btn-icon" onClick={() => openEdit(student)} title="Sửa"><HiOutlinePencil /></button>
                      <button className="btn-icon" onClick={() => openDelete(student)} title="Xoá" style={{ color: 'var(--accent-red)' }}><HiOutlineTrash /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="empty-state">
            <HiOutlineSearch style={{ fontSize: '2rem' }} />
            <h3>Không tìm thấy học sinh</h3>
            <p>Thử thay đổi bộ lọc hoặc thêm học sinh mới</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modal === 'add' ? 'Thêm học sinh mới' : 'Chỉnh sửa học sinh'}</h2>
              <button className="btn-icon" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="form-group">
              <label>Họ và tên *</label>
              <input className="form-input" placeholder="Nguyễn Văn A" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Điện thoại</label>
                <input className="form-input" placeholder="0912345678" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Ngày sinh</label>
                <input className="form-input" type="date" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} />
              </div>
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
                <label>Trạng thái</label>
                <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="active">Đang học</option>
                  <option value="inactive">Tạm nghỉ</option>
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

      {/* Delete Confirm Modal */}
      {modal === 'delete' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="confirm-dialog">
              <h2 style={{ marginBottom: 16 }}>Xác nhận xoá</h2>
              <p>Bạn có chắc muốn xoá học sinh <strong>{editingStudent?.name}</strong>?</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--accent-red)', marginTop: 8 }}>⚠️ Tài khoản đăng nhập của học sinh cũng sẽ bị xoá.</p>
              <div className="actions">
                <button className="btn btn-secondary" onClick={() => setModal(null)}>Huỷ</button>
                <button className="btn btn-danger" onClick={handleDelete}>Xoá</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account Created Modal */}
      {modal === 'account-created' && createdAccount && (
        <div className="modal-overlay" onClick={() => { setModal(null); setCreatedAccount(null); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2><HiOutlineKey /> Tài khoản đã tạo</h2>
              <button className="btn-icon" onClick={() => { setModal(null); setCreatedAccount(null); }}>✕</button>
            </div>
            <div style={{ padding: '0 0 8px' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                Tài khoản cho học sinh <strong style={{ color: 'var(--text-primary)' }}>{createdAccount.studentName}</strong> đã được tạo tự động:
              </p>
              <div style={{
                background: 'rgba(79,140,255,0.06)',
                border: '1px solid rgba(79,140,255,0.15)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Tên đăng nhập</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-blue)', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                    {createdAccount.username}
                  </span>
                </div>
                <div style={{ height: 1, background: 'var(--border-color)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Mật khẩu</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#22c55e', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                    {createdAccount.password}
                  </span>
                </div>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 12 }}>
                💡 Hãy gửi thông tin này cho học sinh để đăng nhập xem học phí.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  navigator.clipboard.writeText(`Tài khoản: ${createdAccount.username}\nMật khẩu: ${createdAccount.password}`);
                  addToast('Đã copy thông tin tài khoản!');
                }}
              >
                📋 Copy
              </button>
              <button className="btn btn-primary" onClick={() => { setModal(null); setCreatedAccount(null); }}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Preview Modal */}
      {modal === 'import' && (
        <div className="modal-overlay" onClick={() => { setModal(null); setImportData([]); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h2>📥 Import học sinh từ Excel</h2>
              <button className="btn-icon" onClick={() => { setModal(null); setImportData([]); }}>✕</button>
            </div>

            <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(79,140,255,0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(79,140,255,0.15)' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--accent-blue)' }}>✓ Tìm thấy <strong>{importData.length}</strong> học sinh. Xem trước và xác nhận bên dưới.</span>
            </div>

            <div style={{ maxHeight: 350, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Họ và tên</th>
                    <th>Điện thoại</th>
                    <th>Ngày sinh</th>
                    <th>Cấp độ</th>
                  </tr>
                </thead>
                <tbody>
                  {importData.map((s, i) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{s.name}</td>
                      <td>{s.phone}</td>
                      <td>{s.dob}</td>
                      <td><span className={`badge badge-${s.level}`}>{getLevelInfo(s.level).name}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setModal(null); setImportData([]); }}>Huỷ</button>
              <button className="btn btn-primary" onClick={handleImportConfirm}>
                <HiOutlineUpload /> Import {importData.length} học sinh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
