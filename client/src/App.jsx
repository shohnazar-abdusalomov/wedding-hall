import { Routes, Route, Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import VenueList from './pages/VenueList';
import VenueDetail from './pages/VenueDetail';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import OwnerDashboard from './pages/OwnerDashboard';
import MyBookings from './pages/MyBookings';

function Toasts() {
  const { toasts } = useAuth();
  if (!toasts.length) return null;
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>{t.message}</div>
      ))}
    </div>
  );
}

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
        <span className="navbar-logo-mark">❀</span> To'yxona
      </Link>
      <div className="navbar-links">
        <NavLink to="/" end>Bosh sahifa</NavLink>
        {!user && <NavLink to="/login" className="nav-cta">Kirish</NavLink>}
        {user?.role === 'user' && <NavLink to="/my-bookings">Bronlarim</NavLink>}
        {user?.role === 'admin' && <NavLink to="/admin">Boshqaruv</NavLink>}
        {user?.role === 'owner' && <NavLink to="/owner">Boshqaruv</NavLink>}
        {user && (
          <>
            <span className="navbar-user">
              <span className="navbar-avatar">{(user.firstName || '?')[0].toUpperCase()}</span>
              {user.firstName}
            </span>
            <button onClick={handleLogout}>Chiqish</button>
          </>
        )}
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <div className="footer-logo">❀ To'yxona</div>
          <p className="footer-tagline">Toshkentdagi eng yaxshi to'yxonalarni onlayn bron qiling.</p>
        </div>
        <div className="footer-cols">
          <div>
            <h4>Tezkor havolalar</h4>
            <Link to="/">To'yxonalar</Link>
            <Link to="/login">Kirish</Link>
          </div>
          <div>
            <h4>Aloqa</h4>
            <span>+998 71 200 00 00</span>
            <span>info@toyxona.uz</span>
          </div>
        </div>
      </div>
      <div className="footer-bottom">© {new Date().getFullYear()} To'yxona — Barcha huquqlar himoyalangan</div>
    </footer>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <Toasts />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<VenueList />} />
          <Route path="/venue/:id" element={<VenueDetail />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/my-bookings" element={<MyBookings />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/owner" element={<OwnerDashboard />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
