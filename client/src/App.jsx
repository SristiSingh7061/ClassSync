import { Navigate, Route, Routes } from 'react-router-dom';
import { homeFor, useAuth } from './auth';
import Login from './pages/Login';
import Register from './pages/Register';
import Student from './pages/Student';
import Teacher from './pages/Teacher';
import Admin from './pages/Admin';

function Guard({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={homeFor(user.role)} replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={homeFor(user.role)} replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to={homeFor(user.role)} replace /> : <Register />} />
      <Route path="/student" element={<Guard role="student"><Student /></Guard>} />
      <Route path="/teacher" element={<Guard role="teacher"><Teacher /></Guard>} />
      <Route path="/admin" element={<Guard role="admin"><Admin /></Guard>} />
      <Route path="*" element={<Navigate to={user ? homeFor(user.role) : '/login'} replace />} />
    </Routes>
  );
}
