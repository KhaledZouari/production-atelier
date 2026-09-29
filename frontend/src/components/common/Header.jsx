import { useAuth } from '../../context/AuthContext';
import { NavLink, useNavigate } from 'react-router-dom';

const logoPath = import.meta.env.VITE_LOGO_PATH || '/logo.png';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="nav-shell sticky top-0 z-20">
      <div className="app-shell py-3 flex items-center gap-6 topbar">
        <div className="leading-tight">
          <div className="brand-name">Atelier</div>
          <div className="brand-sub">Production & suivis</div>
        </div>

        <nav className="topbar-nav flex gap-1 text-sm">
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Dashboard</NavLink>
          <NavLink to="/orders" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>OF</NavLink>
          <NavLink to="/production/new" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Production</NavLink>
          <NavLink to="/productions" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Productions</NavLink>
          <NavLink to="/employees" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Employés</NavLink>
          <NavLink to="/operations" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Opérations</NavLink>
          <NavLink to="/attendance" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Présence</NavLink>
          <NavLink to="/reports" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Rapports</NavLink>
          <NavLink to="/mes" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>MES</NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="logo-mark small">
            <img src={logoPath} alt="Logo atelier" className="logo-img" />
          </div>
          <span className="chip">{user?.username} · {user?.role}</span>
          <button
            onClick={() => navigate('/production/new')}
            className="btn btn-primary text-sm"
          >
            + Nouvelle production
          </button>
          <button onClick={logout} className="btn btn-ghost text-sm">Déconnexion</button>
        </div>
      </div>
    </header>
  );
}
