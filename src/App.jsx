import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import StudentTuition from './pages/StudentTuition';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Classes from './pages/Classes';
import Teachers from './pages/Teachers';
import Schedule from './pages/Schedule';
import Enrollment from './pages/Enrollment';
import Tuition from './pages/Tuition';

function ProtectedRoute({ path, children }) {
  const { hasAccess } = useAuth();
  if (!hasAccess(path)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function AppContent() {
  const { user, isStudent } = useAuth();

  // Chưa đăng nhập
  if (!user) {
    return <Login />;
  }

  // Học sinh → layout riêng
  if (isStudent) {
    return <StudentTuition />;
  }

  // Admin / Teacher / Accountant / Receptionist → layout sidebar
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/students" element={
            <ProtectedRoute path="/students"><Students /></ProtectedRoute>
          } />
          <Route path="/classes" element={
            <ProtectedRoute path="/classes"><Classes /></ProtectedRoute>
          } />
          <Route path="/teachers" element={
            <ProtectedRoute path="/teachers"><Teachers /></ProtectedRoute>
          } />
          <Route path="/schedule" element={
            <ProtectedRoute path="/schedule"><Schedule /></ProtectedRoute>
          } />
          <Route path="/enrollment" element={
            <ProtectedRoute path="/enrollment"><Enrollment /></ProtectedRoute>
          } />
          <Route path="/tuition" element={
            <ProtectedRoute path="/tuition"><Tuition /></ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  const basename = import.meta.env.BASE_URL.replace(/\/+$/, '') || '/';
  return (
    <BrowserRouter basename={basename}>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
