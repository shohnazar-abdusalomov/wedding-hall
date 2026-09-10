import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import Calendar from '../components/Calendar';
import PhotoUpload from '../components/PhotoUpload';
import LocationMap from '../components/LocationMap';
import { geocode, districtCenter } from '../utils/leaflet';

const DISTRICTS = [
  'Bektemir', 'Chilonzor', 'Yakkasaroy', 'Mirobod',
  "Mirzo Ulug'bek", 'Sergeli', 'Shayxontohur', 'Olmazor',
  'Uchtepa', 'Yashnaobod', 'Yunusobod', 'Toshkent tumani'
];
const fmt = n => n ? n.toLocaleString('uz-UZ') : '0';

export default function AdminDashboard() {
  const { user, toast } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [venues, setVenues] = useState([]);
  const [owners, setOwners] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [filters, setFilters] = useState({});

  // Modals
  const [showVenueForm, setShowVenueForm] = useState(false);
  const [showOwnerForm, setShowOwnerForm] = useState(false);
  const [showVenueDetail, setShowVenueDetail] = useState(null);
  const [venueBookings, setVenueBookings] = useState([]);
  const [venueForm, setVenueForm] = useState({});
  const [ownerForm, setOwnerForm] = useState({});
  const [editingVenue, setEditingVenue] = useState(null);
  const [showAssignOwner, setShowAssignOwner] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/login'); return; }
    loadAll();
  }, [user]);

  async function loadAll() {
    try {
      const [sRes, vRes, oRes, bRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/venues', { params: { status: filters.status, search: filters.search, district: filters.district, sortBy: filters.sortBy, order: filters.order } }),
        api.get('/owners'),
        api.get('/bookings'),
      ]);
      setStats(sRes.data);
      setVenues(vRes.data.venues || vRes.data);
      setOwners(oRes.data);
      setBookings(bRes.data);
    } catch {}
  }

  async function loadVenues() {
    try {
      const res = await api.get('/venues', { params: { status: filters.status, search: filters.search, district: filters.district, sortBy: filters.sortBy, order: filters.order } });
      setVenues(res.data.venues || res.data);
    } catch {}
  }

  async function loadBookings() {
    const res = await api.get('/bookings', { params: filters });
    setBookings(res.data);
  }

  // Venue CRUD
  async function handleSaveVenue(e) {
    e.preventDefault();
    setLoading(true);
    try {
      // Xaritada nuqta belgilanmagan bo'lsa: avval rayon nomidan geokodlashga
      // urinamiz, ishlamasa — rayon markazini ishlatamiz. Shunday qilib lat/lng
      // hech qachon bo'sh qolmaydi va sahifada "📍 Joylashuvi" doim ko'rinadi.
      let { lat, lng } = venueForm;
      if (lat == null || lng == null) {
        const geo = await geocode(`${venueForm.district || ''}, Toshkent, Uzbekistan`);
        const fallback = geo || districtCenter(venueForm.district);
        lat = fallback.lat;
        lng = fallback.lng;
      }
      const data = {
        ...venueForm,
        capacity: parseInt(venueForm.capacity),
        pricePerSeat: parseInt(venueForm.pricePerSeat),
        lat,
        lng,
        singers: JSON.stringify(venueForm.singers || []),
        karnaySurnayAvailable: venueForm.karnaySurnayAvailable || false,
        karnaySurnayPrice: venueForm.karnaySurnayPrice || 0,
        menu: JSON.stringify(venueForm.menu || []),
        cars: JSON.stringify(venueForm.cars || []),
        photos: JSON.stringify(venueForm.photos || []),
      };
      if (editingVenue) {
        await api.put(`/venues/${editingVenue._id}`, data);
        toast('To\'yxona yangilandi', 'success');
      } else {
        await api.post('/venues', data);
        toast('To\'yxona qo\'shildi', 'success');
      }
      setShowVenueForm(false);
      setEditingVenue(null);
      setVenueForm({});
      loadAll();
    } catch (err) {
      toast(err.response?.data?.message || 'Xatolik', 'error');
    } finally { setLoading(false); }
  }

  async function handleApprove(id) {
    await api.patch(`/venues/${id}/approve`);
    toast('Tasdiqlandi', 'success');
    loadAll();
  }

  async function handleDeleteVenue(id) {
    if (!confirm('O\'chirishni tasdiqlaysizmi?')) return;
    await api.delete(`/venues/${id}`);
    toast('O\'chirildi', 'success');
    loadAll();
  }

  async function handleAssignOwner(venueId, ownerId) {
    await api.patch(`/venues/${venueId}/assign-owner`, { ownerId });
    toast('Egasi biriktirildi', 'success');
    setShowAssignOwner(null);
    loadAll();
  }

  // Owner CRUD
  async function handleSaveOwner(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/owners', ownerForm);
      toast('To\'yxona egasi qo\'shildi', 'success');
      setShowOwnerForm(false);
      setOwnerForm({});
      loadAll();
    } catch (err) {
      toast(err.response?.data?.message || 'Xatolik', 'error');
    } finally { setLoading(false); }
  }

  async function handleDeleteOwner(id) {
    if (!confirm('O\'chirishni tasdiqlaysizmi?')) return;
    await api.delete(`/owners/${id}`);
    toast('O\'chirildi', 'success');
    loadAll();
  }

  // Booking
  async function handleCancelBooking(id) {
    if (!confirm('Bronni bekor qilishni tasdiqlaysizmi?')) return;
    await api.patch(`/bookings/${id}/cancel`);
    toast('Bron bekor qilindi', 'success');
    loadAll();
  }

  async function showVenueCalendar(v) {
    setShowVenueDetail(v);
    try {
      const res = await api.get(`/bookings/venue/${v._id}`);
      setVenueBookings(res.data);
    } catch {}
  }

  function openEditVenue(v) {
    setEditingVenue(v);
    setVenueForm({
      name: v.name, district: v.district, address: v.address,
      lat: v.lat ?? null, lng: v.lng ?? null,
      capacity: v.capacity, pricePerSeat: v.pricePerSeat, phone: v.phone,
      photos: v.photos || [],
      singers: v.services?.singers || [],
      karnaySurnayAvailable: v.services?.karnaySurnay?.available || false,
      karnaySurnayPrice: v.services?.karnaySurnay?.price || 0,
      menu: v.services?.menu || [],
      cars: v.services?.cars || [],
    });
    setShowVenueForm(true);
  }

  // Dynamic service form helpers
  function addSinger() { setVenueForm(p => ({ ...p, singers: [...(p.singers||[]), { name: '', price: 0 }] })); }
  function removeSinger(i) { setVenueForm(p => ({ ...p, singers: p.singers.filter((_, idx) => idx !== i) })); }
  function updateSinger(i, key, val) { setVenueForm(p => { const s = [...p.singers]; s[i] = { ...s[i], [key]: key === 'price' ? parseInt(val) || 0 : val }; return { ...p, singers: s }; }); }
  function addCar() { setVenueForm(p => ({ ...p, cars: [...(p.cars||[]), { brand: '', price: 0 }] })); }
  function removeCar(i) { setVenueForm(p => ({ ...p, cars: p.cars.filter((_, idx) => idx !== i) })); }
  function updateCar(i, key, val) { setVenueForm(p => { const c = [...p.cars]; c[i] = { ...c[i], [key]: key === 'price' ? parseInt(val) || 0 : val }; return { ...p, cars: c }; }); }
  function addMenu() { setVenueForm(p => ({ ...p, menu: [...(p.menu||[]), { name: '' }] })); }
  function removeMenu(i) { setVenueForm(p => ({ ...p, menu: p.menu.filter((_, idx) => idx !== i) })); }

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="page">
      <h1 className="page-title">Admin boshqaruv paneli</h1>
      <p className="page-subtitle">Xush kelibsiz, {user.firstName}</p>

      <div className="tabs">
        {['stats', 'venues', 'owners', 'bookings'].map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'stats' ? 'Statistika' : t === 'venues' ? 'To\'yxonalar' : t === 'owners' ? 'Egalar' : 'Bronlar'}
          </button>
        ))}
      </div>

      {/* Stats */}
      {tab === 'stats' && stats && (
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-value">{stats.venues}</div><div className="stat-label">Jami to'yxonalar</div></div>
          <div className="stat-card"><div className="stat-value">{stats.approved}</div><div className="stat-label">Tasdiqlangan</div></div>
          <div className="stat-card"><div className="stat-value">{stats.pending}</div><div className="stat-label">Kutilmoqda</div></div>
          <div className="stat-card"><div className="stat-value">{stats.bookings}</div><div className="stat-label">Jami bronlar</div></div>
          <div className="stat-card"><div className="stat-value">{stats.activeBookings}</div><div className="stat-label">Faol bronlar</div></div>
          <div className="stat-card"><div className="stat-value">{stats.owners}</div><div className="stat-label">To'yxona egalari</div></div>
          <div className="stat-card"><div className="stat-value">{stats.users}</div><div className="stat-label">Foydalanuvchilar</div></div>
        </div>
      )}

      {/* Venues */}
      {tab === 'venues' && (
        <>
          <div className="filters-bar">
            <input className="form-input search-input" placeholder="Qidirish..." value={filters.search || ''} onChange={e => setFilters(p => ({ ...p, search: e.target.value }))} onKeyDown={e => e.key === 'Enter' && loadVenues()} />
            <select className="form-select" value={filters.district || ''} onChange={e => { setFilters(p => ({ ...p, district: e.target.value })); setTimeout(loadVenues, 0); }}>
              <option value="">Barcha rayonlar</option>
              {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select className="form-select" value={filters.status || ''} onChange={e => { setFilters(p => ({ ...p, status: e.target.value })); setTimeout(loadVenues, 0); }}>
              <option value="">Barcha statuslar</option>
              <option value="tasdiqlangan">Tasdiqlangan</option>
              <option value="tasdiqlanmagan">Tasdiqlanmagan</option>
            </select>
            <button className="btn btn-primary btn-sm" onClick={() => { setEditingVenue(null); setVenueForm({ singers: [], cars: [], menu: [], photos: [] }); setShowVenueForm(true); }}>
              + Yangi to'yxona
            </button>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nomi</th><th>Rayon</th><th>Sig'im</th><th>Narx</th><th>Status</th><th>Egasi</th><th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {venues.map(v => {
                  const owner = owners.find(o => o._id === v.ownerId);
                  return (
                    <tr key={v._id}>
                      <td style={{ fontWeight: 500, color: 'var(--text)' }}>{v.name}</td>
                      <td>{v.district}</td>
                      <td>{v.capacity}</td>
                      <td>{fmt(v.pricePerSeat)} so'm</td>
                      <td>
                        <span className={`badge ${v.status === 'tasdiqlangan' ? 'badge-green' : 'badge-yellow'}`}>
                          {v.status === 'tasdiqlangan' ? 'Tasdiqlangan' : 'Kutilmoqda'}
                        </span>
                      </td>
                      <td>
                        {owner ? `${owner.firstName} ${owner.lastName}` : (
                          <button className="btn btn-ghost btn-sm" onClick={() => setShowAssignOwner(v)}>Biriktirish</button>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => showVenueCalendar(v)}>Ko'rish</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEditVenue(v)}>Tahrirlash</button>
                          {v.status === 'tasdiqlanmagan' && (
                            <button className="btn btn-success btn-sm" onClick={() => handleApprove(v._id)}>Tasdiqlash</button>
                          )}
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleDeleteVenue(v._id)}>O'chirish</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {venues.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>To'yxonalar yo'q</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Owners */}
      {tab === 'owners' && (
        <>
          <div style={{ marginBottom: '1rem' }}>
            <button className="btn btn-primary btn-sm" onClick={() => { setOwnerForm({}); setShowOwnerForm(true); }}>+ Yangi egasi</button>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Ism</th><th>Familiya</th><th>Email</th><th>Username</th><th>OTP tasdiqlangan</th><th>Amallar</th></tr></thead>
              <tbody>
                {owners.map(o => (
                  <tr key={o._id}>
                    <td style={{ fontWeight: 500 }}>{o.firstName}</td>
                    <td>{o.lastName}</td>
                    <td>{o.email}</td>
                    <td>{o.username}</td>
                    <td><span className={`badge ${o.otpVerified ? 'badge-green' : 'badge-gray'}`}>{o.otpVerified ? 'Ha' : 'Yo\'q'}</span></td>
                    <td><button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleDeleteOwner(o._id)}>O'chirish</button></td>
                  </tr>
                ))}
                {owners.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Egalar yo'q</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Bookings */}
      {tab === 'bookings' && (
        <>
          <div className="filters-bar">
            <select className="form-select" value={filters.bStatus || ''} onChange={e => setFilters(p => ({ ...p, bStatus: e.target.value }))}>
              <option value="">Barcha bronlar</option>
              <option value="upcoming">Endi bo'ladigan</option>
              <option value="past">Bo'lib o'tgan</option>
              <option value="cancelled">Bekor qilingan</option>
            </select>
            <select className="form-select" value={filters.bDistrict || ''} onChange={e => setFilters(p => ({ ...p, bDistrict: e.target.value }))}>
              <option value="">Barcha rayonlar</option>
              {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <button className="btn btn-outline btn-sm" onClick={loadAll}>Yangilash</button>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>ID</th><th>To'yxona</th><th>Sana</th><th>Mehmonlar</th><th>Bron qilgan</th><th>Status</th><th>Amal</th></tr></thead>
              <tbody>
                {bookings
                  .filter(b => {
                    if (filters.bStatus && b.timeStatus !== { upcoming: 'endi bo\'ladigan', past: 'bo\'lib o\'tgan', cancelled: 'bekor qilingan' }[filters.bStatus]) return false;
                    if (filters.bDistrict && b.venueDistrict !== filters.bDistrict) return false;
                    return true;
                  })
                  .map(b => (
                  <tr key={b._id}>
                    <td style={{ fontSize: '0.78rem', fontFamily: 'monospace' }}>{b._id.slice(-6)}</td>
                    <td style={{ fontWeight: 500 }}>{b.venueName}</td>
                    <td>{b.date}</td>
                    <td>{b.guestCount} kishi</td>
                    <td>{b.userFirstName} {b.userLastName}<br /><span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{b.userPhone}</span></td>
                    <td>
                      <span className={`badge ${b.timeStatus === 'endi bo\'ladigan' ? 'badge-green' : b.timeStatus === 'bekor qilingan' ? 'badge-red' : 'badge-gray'}`}>
                        {b.timeStatus}
                      </span>
                    </td>
                    <td>
                      {b.status === 'active' && (
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleCancelBooking(b._id)}>Bekor qilish</button>
                      )}
                    </td>
                  </tr>
                ))}
                {bookings.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Bronlar yo'q</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Venue Form Modal */}
      <Modal open={showVenueForm} onClose={() => { setShowVenueForm(false); setEditingVenue(null); }} title={editingVenue ? 'To\'yxonani tahrirlash' : 'Yangi to\'yxona qo\'shish'}>
        <form onSubmit={handleSaveVenue}>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Nomi</label><input className="form-input" required value={venueForm.name || ''} onChange={e => setVenueForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Rayon</label>
              <select className="form-select" required value={venueForm.district || ''} onChange={e => setVenueForm(p => ({ ...p, district: e.target.value }))}>
                <option value="">Tanlang</option>
                {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Xaritada joylashuvi</label>
            <LocationMap
              value={venueForm.lat != null && venueForm.lng != null ? { lat: venueForm.lat, lng: venueForm.lng } : null}
              onChange={({ lat, lng }) => setVenueForm(p => ({ ...p, lat, lng }))}
            />
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Sig'im (o'rindiq)</label><input className="form-input" type="number" required value={venueForm.capacity || ''} onChange={e => setVenueForm(p => ({ ...p, capacity: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Narx (1 o'rindiq, so'm)</label><input className="form-input" type="number" required value={venueForm.pricePerSeat || ''} onChange={e => setVenueForm(p => ({ ...p, pricePerSeat: e.target.value }))} /></div>
          </div>
          <div className="form-group"><label className="form-label">Telefon</label><input className="form-input" required value={venueForm.phone || ''} onChange={e => setVenueForm(p => ({ ...p, phone: e.target.value }))} /></div>

          <div className="form-group">
            <label className="form-label">Rasmlar</label>
            <PhotoUpload photos={venueForm.photos || []} onChange={photos => setVenueForm(p => ({ ...p, photos }))} />
          </div>

          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, margin: '1rem 0 0.5rem', borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>Qo'shimcha xizmatlar</h4>

          {/* Singers */}
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <label className="form-label" style={{ margin: 0 }}>Honandalar</label>
              <button type="button" className="btn btn-ghost btn-sm" onClick={addSinger}>+ Qo'shish</button>
            </div>
            {(venueForm.singers || []).map((s, i) => (
              <div key={i} className="dynamic-row" style={{ marginBottom: '0.3rem' }}>
                <div className="form-group"><input className="form-input" placeholder="Ism" value={s.name} onChange={e => updateSinger(i, 'name', e.target.value)} /></div>
                <div className="form-group" style={{ maxWidth: 120 }}><input className="form-input" type="number" placeholder="Narx" value={s.price || ''} onChange={e => updateSinger(i, 'price', e.target.value)} /></div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeSinger(i)} style={{ color: 'var(--red)' }}>&times;</button>
              </div>
            ))}
          </div>

          {/* Karnay-surnay */}
          <div className="form-group">
            <label className="form-check">
              <input type="checkbox" checked={venueForm.karnaySurnayAvailable || false} onChange={e => setVenueForm(p => ({ ...p, karnaySurnayAvailable: e.target.checked }))} />
              <span>Karnay-surnay mavjud</span>
            </label>
            {venueForm.karnaySurnayAvailable && (
              <input className="form-input" type="number" placeholder="Narxi (so'm)" value={venueForm.karnaySurnayPrice || ''} onChange={e => setVenueForm(p => ({ ...p, karnaySurnayPrice: e.target.value }))} style={{ marginTop: '0.3rem' }} />
            )}
          </div>

          {/* Menu */}
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <label className="form-label" style={{ margin: 0 }}>Menyu variantlari</label>
              <button type="button" className="btn btn-ghost btn-sm" onClick={addMenu}>+ Qo'shish</button>
            </div>
            {(venueForm.menu || []).map((m, i) => (
              <div key={i} className="dynamic-row" style={{ marginBottom: '0.3rem' }}>
                <div className="form-group"><input className="form-input" placeholder="Taom nomi" value={m.name || m} onChange={e => setVenueForm(p => { const mn = [...p.menu]; mn[i] = { name: e.target.value }; return { ...p, menu: mn }; })} /></div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeMenu(i)} style={{ color: 'var(--red)' }}>&times;</button>
              </div>
            ))}
          </div>

          {/* Cars */}
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <label className="form-label" style={{ margin: 0 }}>Mashina xizmati</label>
              <button type="button" className="btn btn-ghost btn-sm" onClick={addCar}>+ Qo'shish</button>
            </div>
            {(venueForm.cars || []).map((c, i) => (
              <div key={i} className="dynamic-row" style={{ marginBottom: '0.3rem' }}>
                <div className="form-group"><input className="form-input" placeholder="Brand" value={c.brand} onChange={e => updateCar(i, 'brand', e.target.value)} /></div>
                <div className="form-group" style={{ maxWidth: 120 }}><input className="form-input" type="number" placeholder="Narx" value={c.price || ''} onChange={e => updateCar(i, 'price', e.target.value)} /></div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeCar(i)} style={{ color: 'var(--red)' }}>&times;</button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem', borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
            <button type="button" className="btn btn-outline" onClick={() => { setShowVenueForm(false); setEditingVenue(null); }}>Bekor qilish</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saqlanmoqda...' : 'Saqlash'}</button>
          </div>
        </form>
      </Modal>

      {/* Owner Form Modal */}
      <Modal open={showOwnerForm} onClose={() => setShowOwnerForm(false)} title="Yangi to'yxona egasi">
        <form onSubmit={handleSaveOwner}>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Ism</label><input className="form-input" required value={ownerForm.firstName || ''} onChange={e => setOwnerForm(p => ({ ...p, firstName: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Familiya</label><input className="form-input" required value={ownerForm.lastName || ''} onChange={e => setOwnerForm(p => ({ ...p, lastName: e.target.value }))} /></div>
          </div>
          <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" required value={ownerForm.email || ''} onChange={e => setOwnerForm(p => ({ ...p, email: e.target.value }))} /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Username</label><input className="form-input" required value={ownerForm.username || ''} onChange={e => setOwnerForm(p => ({ ...p, username: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Parol</label><input className="form-input" type="password" required value={ownerForm.password || ''} onChange={e => setOwnerForm(p => ({ ...p, password: e.target.value }))} /></div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="button" className="btn btn-outline" onClick={() => setShowOwnerForm(false)}>Bekor qilish</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saqlanmoqda...' : 'Saqlash'}</button>
          </div>
        </form>
      </Modal>

      {/* Assign Owner Modal */}
      <Modal open={!!showAssignOwner} onClose={() => setShowAssignOwner(null)} title="Egani biriktirish">
        {showAssignOwner && (
          <div>
            <p style={{ marginBottom: '1rem', fontSize: '0.9rem' }}><strong>{showAssignOwner.name}</strong> to'yxonasiga egani tanlang:</p>
            {owners.map(o => (
              <div key={o._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border-light)' }}>
                <span>{o.firstName} {o.lastName} ({o.username})</span>
                <button className="btn btn-primary btn-sm" onClick={() => handleAssignOwner(showAssignOwner._id, o._id)}>Biriktirish</button>
              </div>
            ))}
            {owners.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Avval egalarni qo'shing</p>}
          </div>
        )}
      </Modal>

      {/* Venue Detail with Calendar */}
      <Modal open={!!showVenueDetail} onClose={() => { setShowVenueDetail(null); setVenueBookings([]); }} title={showVenueDetail?.name || 'To\'yxona'}>
        {showVenueDetail && (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.87rem', color: 'var(--text-secondary)' }}>
                {showVenueDetail.district} · {showVenueDetail.address} · {showVenueDetail.capacity} o'rindiq · {fmt(showVenueDetail.pricePerSeat)} so'm/kishi
              </div>
            </div>
            <Calendar bookings={venueBookings} onClickBooked={() => {}} />
          </div>
        )}
      </Modal>
    </div>
  );
}
