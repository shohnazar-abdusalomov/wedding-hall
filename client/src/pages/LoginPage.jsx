import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import OtpForm from '../components/OtpForm';

export default function LoginPage() {
  const [tab, setTab] = useState('user');
  const { login, toast, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [otpStep, setOtpStep] = useState(null); // { flow, target, email, devCode }

  // Redirect if already logged in (in an effect, never during render)
  useEffect(() => {
    if (!user) return;
    if (user.role === 'admin') navigate('/admin', { replace: true });
    else if (user.role === 'owner') navigate('/owner', { replace: true });
    else navigate('/', { replace: true });
  }, [user, navigate]);

  if (user) return null;

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  function resetTab(t) {
    setTab(t); setError(''); setOtpStep(null); setForm({}); setIsRegister(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'user') {
        if (isRegister) {
          const res = await api.post('/auth/register', form);
          // Always requires OTP now
          setOtpStep({ flow: 'user-register', target: res.data.target, email: res.data.email, devCode: res.data.devCode });
          toast('Tasdiqlash kodi emailingizga yuborildi', 'info');
        } else {
          const res = await api.post('/auth/login', { phone: form.phone, password: form.password, otpLogin: !!form.otpLogin });
          if (res.data.requireOtp) {
            setOtpStep({ flow: 'user-login', target: res.data.target, email: res.data.email, devCode: res.data.devCode });
            toast('Tasdiqlash kodi emailingizga yuborildi', 'info');
          } else {
            login(res.data.token, res.data.user);
            toast('Xush kelibsiz!', 'success');
            navigate('/');
          }
        }
      } else if (tab === 'owner') {
        const res = await api.post('/auth/owner-login', { username: form.username, password: form.password });
        setOtpStep({ flow: 'owner-login', target: res.data.target, email: res.data.email, devCode: res.data.devCode });
        toast('Tasdiqlash kodi emailingizga yuborildi', 'info');
      } else {
        const res = await api.post('/auth/admin-login', { username: form.username, password: form.password });
        login(res.data.token, res.data.user);
        toast('Xush kelibsiz, Admin!', 'success');
        navigate('/admin');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Xatolik');
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(code) {
    if (otpStep.flow === 'user-register') {
      const res = await api.post('/auth/register/verify', { ...form, otp: code });
      login(res.data.token, res.data.user);
      toast('Muvaffaqiyatli ro\'yxatdan o\'tildi!', 'success');
      navigate('/');
    } else if (otpStep.flow === 'user-login') {
      const res = await api.post('/auth/login/verify', { target: otpStep.target, otp: code });
      login(res.data.token, res.data.user);
      toast('Xush kelibsiz!', 'success');
      navigate('/');
    } else if (otpStep.flow === 'owner-login') {
      const res = await api.post('/auth/owner-login/verify', { target: otpStep.target, otp: code });
      login(res.data.token, res.data.user);
      toast('Tasdiqlandi! Xush kelibsiz!', 'success');
      navigate('/owner');
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Tizimga kirish</h2>
        <p>Davom etish uchun akkauntingizga kiring</p>

        <div className="tabs" style={{ marginBottom: '1.25rem' }}>
          {['user', 'owner', 'admin'].map(t => (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => resetTab(t)}>
              {t === 'user' ? 'Foydalanuvchi' : t === 'owner' ? 'To\'yxona egasi' : 'Admin'}
            </button>
          ))}
        </div>

        {error && !otpStep && (
          <div style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {otpStep ? (
          <>
            <OtpForm
              email={otpStep.email}
              devCode={otpStep.devCode}
              resend={otpStep.flow === 'user-register'
                ? { purpose: 'user-register', target: otpStep.target }
                : { purpose: otpStep.flow, target: otpStep.target }}
              onSubmit={verifyOtp}
            />
            <div style={{ marginTop: '0.85rem', textAlign: 'center' }}>
              <button type="button" className="otp-resend" onClick={() => setOtpStep(null)} style={{ color: 'var(--text-muted)' }}>
                &larr; Ortga
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            {tab === 'user' && isRegister && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Ism</label>
                    <input className="form-input" required value={form.firstName || ''} onChange={e => set('firstName', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Familiya</label>
                    <input className="form-input" required value={form.lastName || ''} onChange={e => set('lastName', e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" required placeholder="email@example.com" value={form.email || ''} onChange={e => set('email', e.target.value)} />
                </div>
              </>
            )}

            {tab === 'user' ? (
              <div className="form-group">
                <label className="form-label">Telefon raqam</label>
                <input className="form-input" required placeholder="+998 90 123 45 67" value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Username</label>
                <input className="form-input" required value={form.username || ''} onChange={e => set('username', e.target.value)} />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Parol</label>
              <input className="form-input" type="password" required value={form.password || ''} onChange={e => set('password', e.target.value)} />
            </div>

            {tab === 'user' && !isRegister && (
              <label className="form-check" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
                <input type="checkbox" checked={!!form.otpLogin} onChange={e => set('otpLogin', e.target.checked)} />
                <span>Email orqali tasdiqlash kodi bilan kirish (xavfsizroq)</span>
              </label>
            )}

            <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading} type="submit">
              {loading ? 'Kutilmoqda...' : isRegister ? 'Ro\'yxatdan o\'tish' : 'Kirish'}
            </button>

            {tab === 'user' && (
              <div className="auth-switch">
                {isRegister ? (
                  <>Akkauntingiz bormi? <button type="button" onClick={() => { setIsRegister(false); setError(''); }}>Kirish</button></>
                ) : (
                  <>Akkauntingiz yo'qmi? <button type="button" onClick={() => { setIsRegister(true); setError(''); }}>Ro'yxatdan o'ting</button></>
                )}
              </div>
            )}

            {tab === 'owner' && (
              <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Kirishda emailingizga tasdiqlash kodi yuboriladi
              </div>
            )}

            {tab === 'admin' && (
              <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Standart: admin / admin123
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
