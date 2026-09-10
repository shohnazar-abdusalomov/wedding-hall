import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Calendar from '../components/Calendar';
import Modal from '../components/Modal';
import OtpForm from '../components/OtpForm';
import LocationMap from '../components/LocationMap';

function formatPrice(n) { return n ? n.toLocaleString('uz-UZ') : '0'; }

export default function VenueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, login, toast } = useAuth();
  const [venue, setVenue] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [guestCount, setGuestCount] = useState('');
  const [selectedServices, setSelectedServices] = useState([]);
  const [showLogin, setShowLogin] = useState(false);
  const [showBookingInfo, setShowBookingInfo] = useState(null);
  const [booking, setBooking] = useState(false);
  const [mainPhoto, setMainPhoto] = useState(0);
  const [userLoc, setUserLoc] = useState(null); // foydalanuvchi joylashuvi (cache)
  const [locating, setLocating] = useState(false);

  // Login form state
  const [loginMode, setLoginMode] = useState('login'); // login or register
  const [loginForm, setLoginForm] = useState({ firstName: '', lastName: '', phone: '', email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [otpStep, setOtpStep] = useState(null); // { target, email, devCode }

  useEffect(() => { loadVenue(); }, [id]);

  // Ruxsat allaqachon berilgan bo'lsa, joylashuvni jim oldindan olib qo'yamiz —
  // shunda "Yo'l ko'rsatish" bosilganda marshrut darhol ochiladi.
  useEffect(() => {
    if (!navigator.geolocation) return;
    const prefetch = () => navigator.geolocation.getCurrentPosition(
      pos => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
    );
    if (navigator.permissions?.query) {
      navigator.permissions.query({ name: 'geolocation' })
        .then(res => { if (res.state === 'granted') prefetch(); })
        .catch(() => {});
    }
  }, []);

  async function loadVenue() {
    try {
      setLoading(true);
      const [venueRes, bookingRes] = await Promise.all([
        api.get(`/venues/${id}`),
        api.get(`/bookings/venue/${id}`),
      ]);
      setVenue(venueRes.data.venue || venueRes.data);
      setBookings(bookingRes.data);
    } catch (err) {
      toast('To\'yxonani yuklashda xatolik', 'error');
    } finally {
      setLoading(false);
    }
  }

  const totalPrice = useMemo(() => {
    if (!venue || !guestCount) return 0;
    let total = parseInt(guestCount) * venue.pricePerSeat;
    selectedServices.forEach(svc => {
      if (svc.type === 'singer') {
        const s = venue.services?.singers?.find(x => x.name === svc.name);
        if (s) total += s.price;
      }
      if (svc.type === 'karnaySurnay') {
        total += venue.services?.karnaySurnay?.price || 0;
      }
      if (svc.type === 'car') {
        const c = venue.services?.cars?.find(x => x.brand === svc.brand);
        if (c) total += c.price;
      }
    });
    return total;
  }, [venue, guestCount, selectedServices]);

  function toggleService(svc) {
    setSelectedServices(prev => {
      const key = svc.type === 'singer' ? svc.name : svc.type === 'car' ? svc.brand : svc.type;
      const exists = prev.find(s => {
        if (s.type === 'singer') return s.name === key;
        if (s.type === 'car') return s.brand === key;
        return s.type === svc.type;
      });
      if (exists) return prev.filter(s => s !== exists);
      return [...prev, svc];
    });
  }

  function isServiceSelected(svc) {
    return selectedServices.some(s => {
      if (svc.type === 'singer') return s.type === 'singer' && s.name === svc.name;
      if (svc.type === 'car') return s.type === 'car' && s.brand === svc.brand;
      return s.type === svc.type;
    });
  }

  async function handleBook() {
    if (!user) {
      setShowLogin(true);
      return;
    }
    if (!selectedDate) { toast('Sanani tanlang', 'error'); return; }
    if (!guestCount || parseInt(guestCount) < 1) { toast('Mehmonlar sonini kiriting', 'error'); return; }
    if (parseInt(guestCount) > venue.capacity) { toast(`Sig'im ${venue.capacity} kishilik`, 'error'); return; }

    try {
      setBooking(true);
      await api.post('/bookings', {
        venueId: id,
        date: selectedDate,
        guestCount: parseInt(guestCount),
        selectedServices,
      });
      toast('Bron tasdiqlandi! Avansni to\'yxona bilan kelishasiz.', 'success');
      setSelectedDate(null);
      setGuestCount('');
      setSelectedServices([]);
      loadVenue();
    } catch (err) {
      toast(err.response?.data?.message || 'Xatolik yuz berdi', 'error');
    } finally {
      setBooking(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError('');
    try {
      if (loginMode === 'register') {
        const res = await api.post('/auth/register', loginForm);
        setOtpStep({ target: res.data.target, email: res.data.email, devCode: res.data.devCode });
        toast('Tasdiqlash kodi emailingizga yuborildi', 'info');
      } else {
        const res = await api.post('/auth/login', { phone: loginForm.phone, password: loginForm.password });
        login(res.data.token, res.data.user);
        toast('Xush kelibsiz!', 'success');
        closeLogin();
      }
    } catch (err) {
      setLoginError(err.response?.data?.message || 'Xatolik');
    }
  }

  async function verifyRegisterOtp(code) {
    const res = await api.post('/auth/register/verify', { ...loginForm, otp: code });
    login(res.data.token, res.data.user);
    toast('Muvaffaqiyatli ro\'yxatdan o\'tildi!', 'success');
    closeLogin();
  }

  // Foydalanuvchi turgan joydan to'yxonagacha Yandex Navigator orqali marshrut quradi.
  // Mobil: Yandex Navigator ilovasi (qurilma GPS'idan), kompyuter: Yandex Xaritalar web marshruti.
  function openYandexRoute() {
    if (venue?.lat == null || venue?.lng == null) return;
    const { lat, lng } = venue;
    const webUrl = (from) =>
      `https://yandex.uz/maps/?rtext=${from || ''}~${lat},${lng}&rtype=auto&mode=routes`;

    const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);

    if (isMobile) {
      // Navigator joriy lokatsiyani o'zi aniqlaydi — faqat manzilni beramiz.
      const navUrl = `yandexnavi://build_route_on_map?lat_to=${lat}&lon_to=${lng}`;
      let appOpened = false;
      const onHide = () => { appOpened = true; };
      document.addEventListener('visibilitychange', onHide, { once: true });
      // Ilova ochilmasa (o'rnatilmagan bo'lsa) — web xaritaga qaytamiz.
      setTimeout(() => {
        document.removeEventListener('visibilitychange', onHide);
        if (!appOpened && !document.hidden) window.location.href = webUrl('');
      }, 1200);
      window.location.href = navUrl;
      return;
    }

    // Lokatsiya allaqachon olingan bo'lsa — kutmasdan darhol ochamiz.
    if (userLoc) {
      window.open(webUrl(`${userLoc.lat},${userLoc.lng}`), '_blank', 'noopener');
      return;
    }

    // Popup-bloker uchun oynani sinxron ochamiz va "yuklanmoqda" ko'rsatamiz.
    const win = window.open('', '_blank');
    if (win) {
      win.document.write('<title>Yandex marshruti</title><p style="font-family:system-ui,sans-serif;padding:28px;color:#0D9488;font-size:16px">🧭 Marshrut tayyorlanmoqda…</p>');
    }
    const finish = (from) => {
      const url = webUrl(from);
      if (win) win.location.href = url;
      else window.open(url, '_blank', 'noopener');
    };
    if (navigator.geolocation) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const me = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLoc(me);
          setLocating(false);
          finish(`${me.lat},${me.lng}`);
        },
        () => {
          // Ruxsat berilmasa / xato — Yandex boshlang'ich nuqtani o'zi so'raydi.
          setLocating(false);
          toast('Joylashuvni aniqlab bo\'lmadi — Yandexda boshlang\'ich nuqtani belgilang', 'info');
          finish('');
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
      );
    } else {
      finish('');
    }
  }

  function closeLogin() {
    setShowLogin(false);
    setLoginError('');
    setOtpStep(null);
    setLoginForm({ firstName: '', lastName: '', phone: '', email: '', password: '' });
  }

  if (loading) return <div className="page"><div className="empty-state"><p>Yuklanmoqda...</p></div></div>;
  if (!venue) return <div className="page"><div className="empty-state"><h3>To'yxona topilmadi</h3></div></div>;

  const advance = Math.round(totalPrice * 0.2);

  return (
    <div className="page">
      <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: '1rem' }}>&larr; Ortga</button>

      <div className="venue-detail">
        <div>
          {/* Photos */}
          <div className="venue-photos">
            <div className="main-photo">
              {venue.photos?.length > 0 ? (
                <img src={venue.photos[mainPhoto] || venue.photos[0]} alt={venue.name} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                  Rasm mavjud emas
                </div>
              )}
            </div>
            {venue.photos?.slice(0, 4).map((p, i) => (
              <div key={i} className={`thumb ${mainPhoto === i ? 'active' : ''}`} onClick={() => setMainPhoto(i)}>
                <img src={p} alt="" loading="lazy" />
              </div>
            ))}
          </div>

          {/* Info */}
          <div className="venue-info">
            <h1>{venue.name}</h1>
            <div className="venue-meta">
              <span>{venue.district}</span>
              <span>{venue.address}</span>
              <span>{venue.phone}</span>
            </div>
            <div className="venue-meta">
              <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{formatPrice(venue.pricePerSeat)} so'm / kishi</span>
              <span>{venue.capacity} o'rindiq</span>
            </div>

            {/* Joylashuvi (xarita) */}
            {venue.lat != null && venue.lng != null && (
              <div className="venue-section">
                <h3>📍 Joylashuvi</h3>
                <LocationMap value={{ lat: venue.lat, lng: venue.lng }} readOnly height={280} />
                <button type="button" className="map-link-btn" onClick={openYandexRoute} disabled={locating}>
                  <span className="compass">🧭</span>
                  <span>{locating ? 'Joylashuv aniqlanmoqda…' : 'Yo\'l ko\'rsatish'}</span>
                  {!locating && <span className="route-arrow">→</span>}
                </button>
              </div>
            )}

            {/* Services */}
            {venue.services && (
              <div className="venue-section">
                <h3>Qo'shimcha xizmatlar</h3>

                {venue.services.singers?.length > 0 && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Honandalar</div>
                    {venue.services.singers.map((s, i) => (
                      <div key={i} className="service-item">
                        <label className="form-check">
                          <input
                            type="checkbox"
                            checked={isServiceSelected({ type: 'singer', name: s.name })}
                            onChange={() => toggleService({ type: 'singer', name: s.name })}
                          />
                          <span className="service-name">{s.name}</span>
                        </label>
                        <span className="service-price">{formatPrice(s.price)} so'm</span>
                      </div>
                    ))}
                  </div>
                )}

                {venue.services.karnaySurnay?.available && (
                  <div className="service-item">
                    <label className="form-check">
                      <input
                        type="checkbox"
                        checked={isServiceSelected({ type: 'karnaySurnay' })}
                        onChange={() => toggleService({ type: 'karnaySurnay' })}
                      />
                      <span className="service-name">Karnay-surnay</span>
                    </label>
                    <span className="service-price">{formatPrice(venue.services.karnaySurnay.price)} so'm</span>
                  </div>
                )}

                {venue.services.menu?.length > 0 && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Menyu variantlari</div>
                    <div className="chip-list">
                      {venue.services.menu.map((m, i) => <span key={i} className="chip">{m.name || m}</span>)}
                    </div>
                  </div>
                )}

                {venue.services.cars?.length > 0 && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Mashina xizmati</div>
                    {venue.services.cars.map((c, i) => (
                      <div key={i} className="service-item">
                        <label className="form-check">
                          <input
                            type="checkbox"
                            checked={isServiceSelected({ type: 'car', brand: c.brand })}
                            onChange={() => toggleService({ type: 'car', brand: c.brand })}
                          />
                          <span className="service-name">{c.brand}</span>
                        </label>
                        <span className="service-price">{formatPrice(c.price)} so'm</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar - calendar & booking */}
        <div className="booking-sidebar calendar-panel">
          <div className="card">
            <Calendar
              bookings={bookings}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onClickBooked={b => setShowBookingInfo(b)}
              isOwner={user?.role === 'owner'}
            />
          </div>

          <div className="card">
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>Bron qilish</h3>

            {selectedDate ? (
              <div style={{ fontSize: '0.87rem', marginBottom: '0.6rem', color: 'var(--green)', fontWeight: 600 }}>
                Tanlangan sana: {selectedDate}
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                Kalendardan bo'sh kunni tanlang
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Mehmonlar soni</label>
              <input
                className="form-input"
                type="number"
                min="1"
                max={venue.capacity}
                placeholder={`Maks: ${venue.capacity}`}
                value={guestCount}
                onChange={e => setGuestCount(e.target.value)}
              />
            </div>

            {guestCount && parseInt(guestCount) > 0 && (
              <div className="price-summary">
                <div className="price-row">
                  <span>{guestCount} kishi × {formatPrice(venue.pricePerSeat)}</span>
                  <span>{formatPrice(parseInt(guestCount) * venue.pricePerSeat)} so'm</span>
                </div>
                {selectedServices.map((svc, i) => {
                  let name = '', price = 0;
                  if (svc.type === 'singer') {
                    const s = venue.services?.singers?.find(x => x.name === svc.name);
                    name = `Honanda: ${svc.name}`;
                    price = s?.price || 0;
                  } else if (svc.type === 'karnaySurnay') {
                    name = 'Karnay-surnay';
                    price = venue.services?.karnaySurnay?.price || 0;
                  } else if (svc.type === 'car') {
                    const c = venue.services?.cars?.find(x => x.brand === svc.brand);
                    name = `Mashina: ${svc.brand}`;
                    price = c?.price || 0;
                  }
                  return (
                    <div key={i} className="price-row">
                      <span>{name}</span>
                      <span>{formatPrice(price)} so'm</span>
                    </div>
                  );
                })}
                <div className="price-row price-total">
                  <span>Umumiy narx</span>
                  <span>{formatPrice(totalPrice)} so'm</span>
                </div>
                <div className="price-row price-advance">
                  <span>Avans to'lov (20%)</span>
                  <span>{formatPrice(advance)} so'm</span>
                </div>
              </div>
            )}

            <button
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '1rem' }}
              disabled={!selectedDate || !guestCount || booking}
              onClick={handleBook}
            >
              {booking ? 'Kutilmoqda...' : user ? 'Bron qilish' : 'Kirish va bron qilish'}
            </button>
          </div>
        </div>
      </div>

      {/* Booking info modal */}
      <Modal
        open={!!showBookingInfo}
        onClose={() => setShowBookingInfo(null)}
        title="Bron ma'lumotlari"
      >
        {showBookingInfo && (
          <div>
            <div className="form-group">
              <div className="form-label">Bron qilgan shaxs</div>
              <div>{showBookingInfo.userFirstName} {showBookingInfo.userLastName}</div>
            </div>
            <div className="form-group">
              <div className="form-label">Telefon</div>
              <div>{showBookingInfo.userPhone || 'Ko\'rsatilmagan'}</div>
            </div>
            <div className="form-group">
              <div className="form-label">Mehmonlar soni</div>
              <div>{showBookingInfo.guestCount} kishi</div>
            </div>
            <div className="form-group">
              <div className="form-label">Sana</div>
              <div>{showBookingInfo.date}</div>
            </div>
          </div>
        )}
      </Modal>

      {/* Login/Register modal */}
      <Modal
        open={showLogin}
        onClose={closeLogin}
        title={otpStep ? 'Emailni tasdiqlash' : loginMode === 'login' ? 'Kirish' : 'Ro\'yxatdan o\'tish'}
      >
        {otpStep ? (
          <OtpForm
            email={otpStep.email}
            devCode={otpStep.devCode}
            resend={{ purpose: 'user-register', target: otpStep.target }}
            onSubmit={verifyRegisterOtp}
            submitLabel="Tasdiqlash va ro'yxatdan o'tish"
          />
        ) : (
          <form onSubmit={handleLogin}>
            {loginError && (
              <div style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {loginError}
              </div>
            )}

            {loginMode === 'register' && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Ism</label>
                    <input className="form-input" required value={loginForm.firstName} onChange={e => setLoginForm(p => ({ ...p, firstName: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Familiya</label>
                    <input className="form-input" required value={loginForm.lastName} onChange={e => setLoginForm(p => ({ ...p, lastName: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" required placeholder="email@example.com" value={loginForm.email} onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))} />
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">Telefon raqam</label>
              <input className="form-input" required placeholder="+998 90 123 45 67" value={loginForm.phone} onChange={e => setLoginForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Parol</label>
              <input className="form-input" type="password" required value={loginForm.password} onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))} />
            </div>

            <button className="btn btn-primary btn-lg" style={{ width: '100%' }} type="submit">
              {loginMode === 'login' ? 'Kirish' : 'Ro\'yxatdan o\'tish'}
            </button>

            <div className="auth-switch">
              {loginMode === 'login' ? (
                <>Akkauntingiz yo'qmi? <button type="button" onClick={() => { setLoginMode('register'); setLoginError(''); }}>Ro'yxatdan o'ting</button></>
              ) : (
                <>Akkauntingiz bormi? <button type="button" onClick={() => { setLoginMode('login'); setLoginError(''); }}>Kirish</button></>
              )}
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
