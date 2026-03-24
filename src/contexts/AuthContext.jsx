import { createContext, useContext, useState, useEffect } from 'react';
import { STAFF_USERS, getAllUsers, ROLE_PERMISSIONS, ROLE_LABELS, ROLES } from '../utils/roles';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('auth_user');
    }
  }, [user]);

  const login = (username, password) => {
    const found = getAllUsers().find(u => u.username === username && u.password === password);
    if (!found) return { success: false, error: 'Sai tên đăng nhập hoặc mật khẩu' };
    
    const { password: _, ...safeUser } = found;
    setUser(safeUser);
    return { success: true };
  };

  const logout = () => {
    setUser(null);
  };

  const hasAccess = (path) => {
    if (!user) return false;
    const permissions = ROLE_PERMISSIONS[user.role] || [];
    return permissions.includes(path);
  };

  const isStudent = user?.role === ROLES.STUDENT;
  const roleLabel = user ? (ROLE_LABELS[user.role] || user.role) : '';

  return (
    <AuthContext.Provider value={{ user, login, logout, hasAccess, isStudent, roleLabel }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
