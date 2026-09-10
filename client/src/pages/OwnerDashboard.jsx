import { useState, useEffect } from 'react';
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

export default function OwnerDashboard() {
  const { user, toast } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('venues');
  const [venues, setVenues] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingVenue, setEditingVenue] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [showCalendar, setShowCalendar] = useState(null);
  const [calBookings, setCalBookings] = useState([]);
  const [filters, setFilters] = useState({});

  useEffect(() => {
    if (!user || user.role !== 'owner') { navigate('/login'); return; }
    loadData();
  }, [user]);

  async function loadData() {
    try {
      const [vRes, bRes] = await Promise.all([
        api.get('/venues'),
        api.get('/bookings'),
      ]);
      setVenues(vRes.data.venues || vRes.data);
      setBookings(bRes.data);
    } catch {}
  }

  async function handleSave(e) {
    e.preventDefault();
    setLoading(true);
    try {
      // Egasi xaritada nuqta belgilamagan bo'lsa — manzildan koordinatani
      // avtomatik aniqlaymiz, shunda to'yxona sahifasida "📍 Joylashuvi"
      // bo'limi doim ko'rinadi.
      let { lat, lng } = form;
      if (lat == null || lng == null) {
        // Egasi xaritada nuqta belgilamagan bo'lsa: avval rayon nomidan
        // geokodlashga urinamiz, ishlamasa — rayon markazini ishlatamiz.
        // Shunday qilib lat/lng hech qachon bo'sh qolmaydi va to'yxona
        // sahifasida "📍 Joylashuvi" doim ko'rinadi.
        const geo = await geocode(`${form.district || ''}, Toshkent, Uzbekistan`);
        const fallback = geo || districtCenter(form.district);
        lat = fallback.lat;
        lng = fallback.lng;
      }
      const data = {
        ...form,
        capacity: parseInt(form.capacity),
        pricePerSeat: parseInt(form.pricePerSeat),
        lat,
        lng,
        singers: JSON.stringify(form.singers || []),
        karnaySurnayAvailable: form.karnaySurnayAvailable || false,
        karnaySurnayPrice: form.karnaySurnayPrice || 0,
        menu: JSON.stringify(form.menu || []),
        cars: JSON.stringify(form.cars || []),
        photos: JSON.stringify(form.photos || []),
      };
      if (editingVenue) {
        await api.put(`/venues/${editingVenue._id}`, data);
        toast('Yangilandi', 'success');
      } else {
        await api.post('/venues', data);
        toast('To\'yxona ro\'yxatdan o\'tkazildi. Admin tasdiqlashini kuting.', 'success');
      }
      setShowForm(false);
      setEditingVenue(null);
      setForm({});
      loadData();
    } catch (err) {
      toast(err.response?.data?.message || 'Xatolik', 'error');
    } finally { setLoading(false); }
  }

  async function handleCancel(id) {
    if (!confirm('Bronni bekor qilishni tasdiqlaysizmi?')) return;
    await api.patch(`/bookings/${id}/cancel`);
    toast('Bron bekor qilindi', 'success');
    loadData();
  }

  async function openCalendar(v) {
    setShowCalendar(v);
    const res = await api.get(`/bookings/venue/${v._id}`);
    setCalBookings(res.data);
  }

  function openEdit(v) {
    setEditingVenue(v);
    setForm({
      name: v.name, district: v.district, address: v.address,
      lat: v.lat ?? null, lng: v.lng ?? null,
      capacity: v.capacity, pricePerSeat: v.pricePerSeat, phone: v.phone,
      photos: v.photos || [], singers: v.services?.singers || [],
      karnaySurnayAvailable: v.services?.karnaySurnay?.available || false,
      karnaySurnayPrice: v.services?.karnaySurnay?.price || 0,
      menu: v.services?.menu || [], cars: v.services?.cars || [],
    });
    setShowForm(true);
  }

  function addSinger() { setForm(p => ({ ...p, singers: [...(p.singers||[]), { name: '', price: 0 }] })); }
  function addCar() { setForm(p => ({ ...p, cars: [...(p.cars||[]), { brand: '', price: 0 }] })); }
  function addMenu() { setForm(p => ({ ...p, menu: [...(p.menu||[]), { name: '' }] })); }

  if (!user || user.role !== 'owner') return null;

  return (
    <div className="page">
      <h1 className="page-title">To'yxona egasi paneli</h1>
      <p className="page-subtitle">Xush kelibsiz, {user.firstName}</p>

      <div className="tabs">
        <button className={`tab ${tab === 'venues' ? 'active' : ''}`} onClick={() => setTab('venues')}>To'yxonalarim</button>
        <button className={`tab ${tab === 'bookings' ? 'active' : ''}`} onClick={() => setTab('bookings')}>Bronlar</button>
      </div>

      {tab === 'venues' && (
        <>
          <div style={{ marginBottom: '1rem' }}>
            <button className="btn btn-primary btn-sm" onClick={() => { setEditingVenue(null); setForm({ singers: [], cars: [], menu: [], photos: [] }); setShowForm(true); }}>
              + To'yxona ro'yxatdan o'tkazish
            </button>
          </div>
          {venues.length === 0 ? (
            <div className="empty-state"><h3>Hali to'yxona qo'shilmagan</h3><p>Yangi to'yxona qo'shish uchun yuqoridagi tugmani bosing</p></div>
          ) : (
            <div className="venue-grid">
              {venues.map(v => (
                <div key={v._id} className="card" style={{ cursor: 'default' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div className="venue-card-name">{v.name}</div>
                    <span className={`badge ${v.status === 'tasdiqlangan' ? 'badge-green' : 'badge-yellow'}`}>
                      {v.status === 'tasdiqlangan' ? 'Tasdiqlangan' : 'Kutilmoqda'}
                    </span>
                  </div>
                  <div className="venue-card-district">{v.district} · {v.capacity} o'rindiq · {fmt(v.pricePerSeat)} so'm</div>
                  <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.75rem' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => openCalendar(v)}>Kalendar</button>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(v)}>Tahrirlash</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'bookings' && (
        <>
          <div className="filters-bar">
            <select className="form-select" value={filters.bStatus || ''} onChange={e => setFilters(p => ({ ...p, bStatus: e.target.value }))}>
              <option value="">Barcha bronlar</option>
              <option value="upcoming">Endi bo'ladigan</option>
              <option value="past">Bo'lib o'tgan</option>
              <option value="cancelled">Bekor qilingan</option>
            </select>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>To'yxona</th><th>Sana</th><th>Mehmonlar</th><th>Bron qilgan</th><th>Status</th><th>Amal</th></tr></thead>
              <tbody>
                {bookings
                  .filter(b => !filters.bStatus || b.timeStatus === { upcoming: 'endi bo\'ladigan', past: 'bo\'lib o\'tgan', cancelled: 'bekor qilingan' }[filters.bStatus])
                  .map(b => (
                  <tr key={b._id}>
                    <td style={{ fontWeight: 500 }}>{b.venueName}</td>
                    <td>{b.date}</td>
                    <td>{b.guestCount} kishi</td>
                    <td>{b.userFirstName} {b.userLastName}<br /><span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{b.userPhone}</span></td>
                    <td><span className={`badge ${b.timeStatus === 'endi bo\'ladigan' ? 'badge-green' : b.timeStatus === 'bekor qilingan' ? 'badge-red' : 'badge-gray'}`}>{b.timeStatus}</span></td>
                    <td>{b.status === 'active' && <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleCancel(b._id)}>Bekor qilish</button>}</td>
                  </tr>
                ))}
                {bookings.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Bronlar yo'q</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Venue Form */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setEditingVenue(null); }} title={editingVenue ? 'Tahrirlash' : 'Yangi to\'yxona'}>
        <form onSubmit={handleSave}>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Nomi</label><input className="form-input" required value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Rayon</label>
              <select className="form-select" required value={form.district || ''} onChange={e => setForm(p => ({ ...p, district: e.target.value }))}>
                <option value="">Tanlang</option>{DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Xaritada joylashuvi</label>
            <LocationMap
              value={form.lat != null && form.lng != null ? { lat: form.lat, lng: form.lng } : null}
              onChange={({ lat, lng }) => setForm(p => ({ ...p, lat, lng }))}
            />
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Sig'im</label><input className="form-input" type="number" required value={form.capacity || ''} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Narx (so'm/kishi)</label><input className="form-input" type="number" required value={form.pricePerSeat || ''} onChange={e => setForm(p => ({ ...p, pricePerSeat: e.target.value }))} /></div>
          </div>
          <div className="form-group"><label className="form-label">Telefon</label><input className="form-input" required value={form.phone || ''} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>

          <div className="form-group">
            <label className="form-label">Rasmlar</label>
            <PhotoUpload photos={form.photos || []} onChange={photos => setForm(p => ({ ...p, photos }))} />
          </div>

          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, margin: '1rem 0 0.5rem', borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>Xizmatlar</h4>
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><label className="form-label" style={{ margin: 0 }}>Honandalar</label><button type="button" className="btn btn-ghost btn-sm" onClick={addSinger}>+</button></div>
            {(form.singers||[]).map((s,i) => (
              <div key={i} className="dynamic-row" style={{ marginBottom: '0.3rem' }}>
                <div className="form-group"><input className="form-input" placeholder="Ism" value={s.name} onChange={e => setForm(p => { const sg = [...p.singers]; sg[i] = { ...sg[i], name: e.target.value }; return { ...p, singers: sg }; })} /></div>
                <div className="form-group" style={{ maxWidth: 120 }}><input className="form-input" type="number" placeholder="Narx" value={s.price||''} onChange={e => setForm(p => { const sg = [...p.singers]; sg[i] = { ...sg[i], price: parseInt(e.target.value)||0 }; return { ...p, singers: sg }; })} /></div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm(p => ({ ...p, singers: p.singers.filter((_,idx)=>idx!==i) }))} style={{ color: 'var(--red)' }}>&times;</button>
              </div>
            ))}
          </div>
          <div className="form-group">
            <label className="form-check"><input type="checkbox" checked={form.karnaySurnayAvailable||false} onChange={e => setForm(p => ({ ...p, karnaySurnayAvailable: e.target.checked }))} /><span>Karnay-surnay</span></label>
            {form.karnaySurnayAvailable && <input className="form-input" type="number" placeholder="Narxi" value={form.karnaySurnayPrice||''} onChange={e => setForm(p => ({ ...p, karnaySurnayPrice: e.target.value }))} style={{ marginTop: '0.3rem' }} />}
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><label className="form-label" style={{ margin: 0 }}>Menyu</label><button type="button" className="btn btn-ghost btn-sm" onClick={addMenu}>+</button></div>
            {(form.menu||[]).map((m,i) => (
              <div key={i} className="dynamic-row" style={{ marginBottom: '0.3rem' }}>
                <div className="form-group"><input className="form-input" placeholder="Taom nomi" value={typeof m === 'string' ? m : (m.name || '')} onChange={e => setForm(p => { const mn=[...p.menu]; mn[i]={ name: e.target.value }; return { ...p, menu: mn }; })} /></div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm(p => ({ ...p, menu: p.menu.filter((_,idx)=>idx!==i) }))} style={{ color: 'var(--red)' }}>&times;</button>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><label className="form-label" style={{ margin: 0 }}>Mashinalar</label><button type="button" className="btn btn-ghost btn-sm" onClick={addCar}>+</button></div>
            {(form.cars||[]).map((c,i) => (
              <div key={i} className="dynamic-row" style={{ marginBottom: '0.3rem' }}>
                <div className="form-group"><input className="form-input" placeholder="Brand" value={c.brand} onChange={e => setForm(p => { const cs=[...p.cars]; cs[i]={ ...cs[i], brand: e.target.value }; return { ...p, cars: cs }; })} /></div>
                <div className="form-group" style={{ maxWidth: 120 }}><input className="form-input" type="number" placeholder="Narx" value={c.price||''} onChange={e => setForm(p => { const cs=[...p.cars]; cs[i]={ ...cs[i], price: parseInt(e.target.value)||0 }; return { ...p, cars: cs }; })} /></div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm(p => ({ ...p, cars: p.cars.filter((_,idx)=>idx!==i) }))} style={{ color: 'var(--red)' }}>&times;</button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Bekor qilish</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saqlanmoqda...' : 'Saqlash'}</button>
          </div>
        </form>
      </Modal>

      {/* Calendar */}
      <Modal open={!!showCalendar} onClose={() => setShowCalendar(null)} title={showCalendar?.name || ''}>
        {showCalendar && <Calendar bookings={calBookings} />}
      </Modal>
    </div>
  );
}
