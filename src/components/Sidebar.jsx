import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_COLORS } from '../utils/roles';
import { 
  HiOutlineViewGrid, 
  HiOutlineUserGroup, 
  HiOutlineAcademicCap, 
  HiOutlineBriefcase,
  HiOutlineCalendar,
  HiOutlineClipboardList,
  HiOutlineCash,
  HiOutlineSparkles,
  HiOutlineLogout,
  HiOutlineMenu,
  HiOutlineX,
} from 'react-icons/hi';
import './Sidebar.css';

const allNavItems = [
  { path: '/', icon: HiOutlineViewGrid, label: 'Dashboard' },
  { path: '/students', icon: HiOutlineUserGroup, label: 'Học sinh' },
  { path: '/classes', icon: HiOutlineAcademicCap, label: 'Lớp học' },
  { path: '/teachers', icon: HiOutlineBriefcase, label: 'Giáo viên' },
  { path: '/schedule', icon: HiOutlineCalendar, label: 'Lịch học' },
  { path: '/enrollment', icon: HiOutlineClipboardList, label: 'Ghi danh' },
  { path: '/tuition', icon: HiOutlineCash, label: 'Học phí' },
];

export default function Sidebar() {
  const { user, logout, hasAccess, roleLabel } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Auto-close sidebar khi navigate trên mobile
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Lock body scroll khi sidebar mở trên mobile
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const navItems = allNavItems.filter(item => hasAccess(item.path));
  const roleColor = user ? (ROLE_COLORS[user.role] || '#888') : '#888';

  return (
    <>
      {/* Hamburger button — only visible on mobile */}
      <button
        className="hamburger-btn"
        onClick={() => setMobileOpen(prev => !prev)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <HiOutlineX /> : <HiOutlineMenu />}
      </button>

      {/* Overlay — only visible on mobile when open */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">
            <HiOutlineSparkles />
          </div>
          <div className="logo-text">
            <h2>Anh Ngữ Phúc Ngôn</h2>
            <span>Quản lý</span>
          </div>
          {/* Close button inside sidebar on mobile */}
          <button
            className="sidebar-close-btn"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <HiOutlineX />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <item.icon className="nav-icon" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-info">
            <div className="footer-avatar" style={{ 
              background: roleColor + '22', 
              color: roleColor,
            }}>
              {user?.displayName?.charAt(0) || 'U'}
            </div>
            <div>
              <p className="footer-name">{user?.displayName || 'User'}</p>
              <p className="footer-role" style={{ color: roleColor }}>{roleLabel}</p>
            </div>
          </div>
          <button
            className="sidebar-logout-btn"
            onClick={logout}
            title="Đăng xuất"
          >
            <HiOutlineLogout />
          </button>
        </div>
      </aside>
    </>
  );
}
