import './styles.css';
import { useState } from 'react';

import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import DeptDashboard from './pages/DeptDashboard';

function App() {
  const [user, setUser] = useState(null);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
  };

  if (!user) {
    return <Login setUser={handleLogin} />;
  }

  const role = String(user.role || '').trim().toUpperCase();

  if (role === 'ADMIN') {
    return <AdminDashboard user={user} onLogout={handleLogout} />;
  }

  if (role === 'DEPT') {
    return <DeptDashboard user={user} onLogout={handleLogout} />;
  }

  return <div>Unauthorized Role</div>;
}

export default App;
