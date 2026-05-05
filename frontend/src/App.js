import './styles.css';
import { useState } from 'react';

import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import DeptEntry from './pages/DeptEntry';

function App() {
  const [user, setUser] = useState(null);

  if (!user) return <Login setUser={setUser} />;

  // ✅ ADMIN
  if (user.role === 'ADMIN') {
    return <AdminDashboard />;
  }

  // ✅ DEPARTMENT USER
  if (user.role === 'DEPT') {
    return <DeptEntry deptId={user.dept_id} />;
  }

  return <div>Unauthorized Role</div>;
}

export default App;