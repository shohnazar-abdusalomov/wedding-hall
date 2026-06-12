import { useState, useEffect } from 'react';
import api from '../api';

/**
 * Reusable OTP entry step.
 * Props:
 *  - email: masked email to show the user
 *  - devCode: code returned by the server in dev mode (optional)
 *  - resend: { purpose, target } to call /auth/resend-otp (optional)
 *  - onSubmit(code): async, throws on error (message shown)
 *  - submitLabel
 */
export default function OtpForm({ email, devCode, resend, onSubmit, submitLabel = 'Tasdiqlash' }) {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [hint, setHint] = useState(devCode || '');

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSubmit(otp.trim());
    } catch (err) {
      setError(err.response?.data?.message || 'Kod noto\'g\'ri');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!resend) return;
    setError('');
    try {
      const res = await api.post('/auth/resend-otp', resend);
      setCooldown(60);
      if (res.data.devCode) setHint(res.data.devCode);
    } catch (err) {
      setError(err.response?.data?.message || 'Qayta yuborishda xatolik');
      const m = err.response?.data?.message?.match(/(\d+)\s*soniya/);
      if (m) setCooldown(parseInt(m[1], 10));
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <p style={{ fontSize: '0.87rem', marginBottom: '1rem', textAlign: 'left', color: 'var(--text-secondary)' }}>
        <strong>{email}</strong> manziliga 6 xonali kod yuborildi. Kodni kiriting.
      </p>
      {hint && <div className="dev-otp-hint">Test rejimi kodi: <strong>{hint}</strong></div>}
      {error && (
        <div style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}
      <div className="form-group">
        <label className="form-label">Tasdiqlash kodi</label>
        <input
          className="form-input"
          required
          inputMode="numeric"
          maxLength={6}
          placeholder="6 xonali kod"
          value={otp}
          onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
          style={{ textAlign: 'center', fontSize: '1.3rem', letterSpacing: '0.3em' }}
          autoFocus
        />
      </div>
      <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading || otp.length < 6} type="submit">
        {loading ? 'Tekshirilmoqda...' : submitLabel}
      </button>
      {resend && (
        <div style={{ marginTop: '0.85rem', textAlign: 'center', fontSize: '0.83rem', color: 'var(--text-muted)' }}>
          Kod kelmadimi?{' '}
          <button type="button" className="otp-resend" onClick={handleResend} disabled={cooldown > 0}>
            {cooldown > 0 ? `Qayta yuborish (${cooldown}s)` : 'Qayta yuborish'}
          </button>
        </div>
      )}
    </form>
  );
}
