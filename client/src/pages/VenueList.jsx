import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const DISTRICTS = [
  'Bektemir', 'Chilonzor', 'Yakkasaroy', 'Mirobod',
  'Mirzo Ulug\'bek', 'Sergeli', 'Shayxontohur', 'Olmazor',
  'Uchtepa', 'Yashnaobod', 'Yunusobod', 'Toshkent tumani'
];

function formatPrice(n) {
  if (!n) return '0';
  return n.toLocaleString('uz-UZ');
}

export default function VenueList() {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [order, setOrder] = useState('asc');

  useEffect(() => {
    load();
  }, [district, sortBy, order]);

  async function load() {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (district) params.district = district;
      if (sortBy) { params.sortBy = sortBy; params.order = order; }
      const res = await api.get('/venues', { params });
      setVenues(res.data.venues || res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    load();
  }

  function toggleSort(field) {
    if (sortBy === field) {
      setOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setOrder('asc');
    }
  }

  return (
    <div>
      {/* HERO */}
      <section className="hero">
        <div className="hero-overlay" />
        <div className="hero-content">
          <span className="hero-eyebrow">Toshkent · Onlayn bron</span>
          <h1 className="hero-title">Orzuingizdagi to'y shu yerdan boshlanadi</h1>
          <p className="hero-subtitle">
            Shahardagi eng nufuzli to'yxonalarni ko'ring, bo'sh kunlarni tanlang va bir necha daqiqada onlayn bron qiling.
          </p>
          <a href="#venues" className="btn btn-primary btn-lg hero-btn">To'yxonalarni ko'rish</a>
          <div className="hero-stats">
            <div><strong>{venues.length || '6+'}</strong><span>To'yxona</span></div>
            <div><strong>12</strong><span>Rayon</span></div>
            <div><strong>24/7</strong><span>Onlayn bron</span></div>
          </div>
        </div>
      </section>

    <div className="page" id="venues">
      <h2 className="page-title">To'yxonalar</h2>
      <p className="page-subtitle">Toshkent shahridagi eng yaxshi to'yxonalarni toping va onlayn bron qiling</p>

      <div className="filters-bar">
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.4rem', flex: 1, minWidth: 200 }}>
          <input
            className="form-input search-input"
            placeholder="To'yxonani qidirish..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-primary btn-sm">Qidirish</button>
        </form>

        <select className="form-select" value={district} onChange={e => setDistrict(e.target.value)}>
          <option value="">Barcha rayonlar</option>
          {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <button
          className={`btn btn-sm ${sortBy === 'price' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => toggleSort('price')}
        >
          Narx {sortBy === 'price' ? (order === 'asc' ? '↑' : '↓') : ''}
        </button>
        <button
          className={`btn btn-sm ${sortBy === 'capacity' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => toggleSort('capacity')}
        >
          Sig'im {sortBy === 'capacity' ? (order === 'asc' ? '↑' : '↓') : ''}
        </button>
        {(search || district || sortBy) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setDistrict(''); setSortBy(''); setOrder('asc'); setTimeout(load, 0); }}>
            Tozalash
          </button>
        )}
      </div>

      {loading ? (
        <div className="venue-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="venue-card skeleton-card">
              <div className="skeleton skeleton-img" />
              <div className="venue-card-body">
                <div className="skeleton skeleton-line" style={{ width: '70%' }} />
                <div className="skeleton skeleton-line" style={{ width: '45%' }} />
                <div className="skeleton skeleton-line" style={{ width: '90%', marginTop: '0.8rem' }} />
              </div>
            </div>
          ))}
        </div>
      ) : venues.length === 0 ? (
        <div className="empty-state">
          <h3>To'yxonalar topilmadi</h3>
          <p>Qidiruv mezonlaringizni o'zgartiring yoki keyinroq qayta urinib ko'ring</p>
        </div>
      ) : (
        <div className="venue-grid">
          {venues.map(v => (
            <Link to={`/venue/${v._id}`} key={v._id} className="venue-card">
              <div className="venue-card-img">
                {v.photos && v.photos.length > 0 ? (
                  <img src={v.photos[0]} alt={v.name} loading="lazy" />
                ) : (
                  <span>Rasm mavjud emas</span>
                )}
                <span className="venue-card-pill">{v.district}</span>
              </div>
              <div className="venue-card-body">
                <div className="venue-card-name">{v.name}</div>
                <div className="venue-card-district">📍 {v.address}</div>
                <div className="venue-card-row">
                  <span className="venue-card-price">{formatPrice(v.pricePerSeat)} <small>so'm/kishi</small></span>
                  <span className="venue-card-cap">👥 {v.capacity}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
    </div>
  );
}
