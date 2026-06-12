import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const fmt = n => n ? n.toLocaleString('uz-UZ') : '0';

export default function MyBookings() {
  const { user, toast } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'user') { navigate('/login'); return; }
    load();
  }, [user]);

  async function load() {
    try {
      setLoading(true);
      const res = await api.get('/bookings');
      setBookings(res.data);
    } catch {
      toast('Xatolik yuz berdi', 'error');
    } finally { setLoading(false); }
  }

  async function handleCancel(id) {
    if (!confirm('Bronni bekor qilishni tasdiqlaysizmi?')) return;
    try {
      await api.patch(`/bookings/${id}/cancel`);
      toast('Bron bekor qilindi', 'success');
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Xatolik', 'error');
    }
  }

  const filtered = bookings.filter(b => {
    if (!filter) return true;
    if (filter === 'upcoming') return b.timeStatus === 'endi bo\'ladigan';
    if (filter === 'past') return b.timeStatus === 'bo\'lib o\'tgan';
    if (filter === 'cancelled') return b.timeStatus === 'bekor qilingan';
    return true;
  });

  if (!user) return null;

  return (
    <div className="page">
      <h1 className="page-title">Mening bronlarim</h1>
      <p className="page-subtitle">Barcha bron qilgan to'ylaringiz shu yerda</p>

      <div className="filters-bar">
        <select className="form-select" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">Barchasi</option>
          <option value="upcoming">Endi bo'ladigan</option>
          <option value="past">Bo'lib o'tgan</option>
          <option value="cancelled">Bekor qilingan</option>
        </select>
        <button className="btn btn-outline btn-sm" onClick={load}>Yangilash</button>
      </div>

      {loading ? (
        <div className="empty-state"><p>Yuklanmoqda...</p></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <h3>Bronlar topilmadi</h3>
          <p>Hali bron qilmaganmisiz? <Link to="/" style={{ color: 'var(--primary)', fontWeight: 600 }}>To'yxonalarni ko'ring</Link></p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtered.map(b => (
            <div key={b._id} className="card" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                  <Link to={`/venue/${b.venueId}`} style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--text)', textDecoration: 'none' }}>
                    {b.venueName}
                  </Link>
                  <span className={`badge ${b.timeStatus === 'endi bo\'ladigan' ? 'badge-green' : b.timeStatus === 'bekor qilingan' ? 'badge-red' : 'badge-gray'}`}>
                    {b.timeStatus}
                  </span>
                </div>
                <div style={{ fontSize: '0.87rem', color: 'var(--text-secondary)', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <span>Sana: <strong>{b.date}</strong></span>
                  <span>Mehmonlar: <strong>{b.guestCount} kishi</strong></span>
                  <span>Rayon: {b.venueDistrict}</span>
                </div>
                {b.services && b.services.length > 0 && (
                  <div style={{ marginTop: '0.4rem' }}>
                    <div className="chip-list">
                      {b.services.map((s, i) => (
                        <span key={i} className="chip">{s.type}: {s.name} ({fmt(s.price)} so'm)</span>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1.5rem', fontSize: '0.88rem' }}>
                  <span>Umumiy: <strong style={{ color: 'var(--text)' }}>{fmt(b.totalPrice)} so'm</strong></span>
                  <span>Avans (20%): <strong style={{ color: 'var(--primary)' }}>{fmt(b.advance)} so'm</strong></span>
                </div>
              </div>
              <div>
                {b.status === 'active' && b.timeStatus === 'endi bo\'ladigan' && (
                  <button className="btn btn-outline btn-sm" style={{ color: 'var(--red)', borderColor: 'var(--red)' }} onClick={() => handleCancel(b._id)}>
                    Bekor qilish
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
