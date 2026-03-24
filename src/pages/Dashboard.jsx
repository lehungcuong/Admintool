import { useLocalStorage } from '../hooks/useLocalStorage';
import { CLASS_LEVELS, getLevelInfo, PAYMENT_STATUSES } from '../utils/data';
import { HiOutlineUserGroup, HiOutlineAcademicCap, HiOutlineBriefcase, HiOutlineChartBar } from 'react-icons/hi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export default function Dashboard() {
  const [students] = useLocalStorage('students', []);
  const [classes] = useLocalStorage('classes', []);
  const [teachers] = useLocalStorage('teachers', []);
  const [enrollments] = useLocalStorage('enrollments', []);
  const [payments] = useLocalStorage('payments', []);

  const activeStudents = students.filter(s => s.status === 'active').length;
  const activeTeachers = teachers.filter(t => t.status === 'active').length;
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const paidStudents = students.filter(s => payments.some(p => p.studentId === s.id && p.month === currentMonth && p.year === currentYear)).length;
  const unpaidStudents = students.length - paidStudents;

  // Students by level
  const studentsByLevel = CLASS_LEVELS.map(level => ({
    name: level.name,
    value: students.filter(s => s.level === level.id).length,
    color: level.color,
  }));

  // Enrollment by class
  const enrollmentByClass = classes.slice(0, 6).map(cls => ({
    name: cls.name,
    enrolled: enrollments.filter(e => e.classId === cls.id).length,
    capacity: cls.capacity,
  }));

  const stats = [
    { icon: HiOutlineUserGroup, label: 'Học sinh', value: students.length, sub: `${activeStudents} đang học`, bg: 'rgba(79, 140, 255, 0.12)', color: '#4f8cff' },
    { icon: HiOutlineAcademicCap, label: 'Lớp học', value: classes.length, sub: `${CLASS_LEVELS.length} cấp độ`, bg: 'rgba(168, 85, 247, 0.12)', color: '#a855f7' },
    { icon: HiOutlineBriefcase, label: 'Giáo viên', value: teachers.length, sub: `${activeTeachers} đang dạy`, bg: 'rgba(34, 197, 94, 0.12)', color: '#22c55e' },
    { icon: HiOutlineChartBar, label: 'Học phí', value: `${paidStudents}/${students.length}`, sub: `${unpaidStudents} chưa đóng`, bg: 'rgba(249, 115, 22, 0.12)', color: '#f97316' },
  ];

  const recentActivities = [
    { text: 'Lớp Pre-starter A bắt đầu khóa mới', time: 'Hôm nay' },
    { text: 'Thêm 3 học sinh mới vào Starters B', time: 'Hôm qua' },
    { text: 'Giáo viên David Johnson xác nhận lịch dạy', time: '2 ngày trước' },
    { text: 'Lớp KET Intensive đạt 90% capacity', time: '3 ngày trước' },
    { text: 'Thi cuối kỳ Movers A hoàn thành', time: '1 tuần trước' },
  ];

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Tổng quan trung tâm tiếng Anh EnglishHub</p>
      </div>

      <div className="stats-grid">
        {stats.map((stat, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ background: stat.bg, color: stat.color }}>
              <stat.icon />
            </div>
            <div className="stat-info">
              <h3>{stat.value}</h3>
              <p>{stat.label} • {stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="charts-row">
        <div className="chart-container">
          <h3>📊 Phân bố học sinh theo cấp độ</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={studentsByLevel}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {studentsByLevel.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#161837',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#e8eaff',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>📈 Sĩ số theo lớp</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={enrollmentByClass}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#8b8fb0', fontSize: 11 }} />
              <YAxis tick={{ fill: '#8b8fb0', fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: '#161837',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#e8eaff',
                }}
              />
              <Bar dataKey="enrolled" fill="#4f8cff" radius={[4, 4, 0, 0]} name="Đã ghi danh" />
              <Bar dataKey="capacity" fill="rgba(255,255,255,0.08)" radius={[4, 4, 0, 0]} name="Sức chứa" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-container" style={{ marginTop: 16 }}>
        <h3>🕐 Hoạt động gần đây</h3>
        <div style={{ padding: '8px 0' }}>
          {recentActivities.map((act, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 4px',
              borderBottom: i < recentActivities.length - 1 ? '1px solid var(--border-color)' : 'none',
            }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{act.text}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: 16 }}>{act.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
