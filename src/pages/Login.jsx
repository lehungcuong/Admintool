import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { STAFF_USERS, ROLE_LABELS, ROLE_COLORS } from '../utils/roles';
import { HiOutlineSparkles, HiOutlineExclamation } from 'react-icons/hi';
import './Login.css';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(username.trim(), password);
    if (!result.success) {
      setError(result.error);
    }
  };

  const fillDemo = (u) => {
    setUsername(u.username);
    setPassword(u.password);
    setError('');
  };



  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <img src="/logo.png" alt="Phuc Ngon English Center" style={{ width: 120, height: 120, objectFit: 'contain', marginBottom: 8 }} />
          <h1>Anh Ngữ Phúc Ngôn</h1>
          <p>Đăng nhập để tiếp tục</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-input-group">
            <label>Tên đăng nhập</label>
            <input
              id="login-username"
              type="text"
              placeholder="Nhập tên đăng nhập"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
            />
          </div>

          <div className="login-input-group">
            <label>Mật khẩu</label>
            <input
              id="login-password"
              type="password"
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="login-error">
              <HiOutlineExclamation />
              {error}
            </div>
          )}

          <button type="submit" className="login-btn" id="login-submit">
            Đăng nhập
          </button>
        </form>

      </div>
    </div>
  );
}
