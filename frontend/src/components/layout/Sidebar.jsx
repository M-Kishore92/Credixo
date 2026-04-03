import { NavLink, useNavigate } from 'react-router-dom';
import { Home, FilePlus, LayoutDashboard, Clock, LogOut } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/apply', icon: FilePlus, label: 'New Application' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
];

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('officer');
    navigate('/');
  };

  return (
    <aside style={{
      width: 240,
      minHeight: 'calc(100vh - 64px)',
      background: 'white',
      borderRight: '1px solid var(--color-border)',
      padding: '24px 16px',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              borderRadius: 12,
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: isActive ? 600 : 500,
              color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              background: isActive ? 'var(--color-primary-soft)' : 'transparent',
              transition: 'all 0.2s ease',
            })}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </div>

      <button
        onClick={handleLogout}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px', borderRadius: 12,
          border: 'none', background: 'none', cursor: 'pointer',
          fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-text-muted)',
          transition: 'all 0.2s ease', width: '100%',
        }}
      >
        <LogOut size={18} />
        Logout
      </button>
    </aside>
  );
}
