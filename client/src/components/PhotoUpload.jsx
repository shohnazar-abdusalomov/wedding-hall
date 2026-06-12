import { useRef, useState } from 'react';
import api from '../api';

// Controlled photo uploader. `photos` is an array of URL strings;
// `onChange(nextPhotos)` is called whenever the list changes.
export default function PhotoUpload({ photos = [], onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setError('');
    setUploading(true);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('photos', f));
      const res = await api.post('/venues/upload-photos', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onChange([...(photos || []), ...res.data.urls]);
    } catch (err) {
      setError(err.response?.data?.message || 'Yuklashda xatolik');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function removeAt(i) {
    onChange(photos.filter((_, idx) => idx !== i));
  }

  function move(i, dir) {
    const next = [...photos];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div className="photo-upload">
      <div className="photo-upload-grid">
        {photos.map((url, i) => (
          <div key={url + i} className="photo-thumb">
            <img src={url} alt="" />
            {i === 0 && <span className="photo-badge">Asosiy</span>}
            <div className="photo-actions">
              <button type="button" title="Chapga" onClick={() => move(i, -1)} disabled={i === 0}>&larr;</button>
              <button type="button" title="O'chirish" className="del" onClick={() => removeAt(i)}>&times;</button>
              <button type="button" title="O'ngga" onClick={() => move(i, 1)} disabled={i === photos.length - 1}>&rarr;</button>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="photo-add"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Yuklanmoqda...' : '+ Rasm qo\'shish'}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFiles}
      />
      {error && <div className="photo-error">{error}</div>}
      <div className="photo-hint">Birinchi rasm asosiy sifatida ko'rsatiladi. Sudrab emas, strelkalar bilan tartiblang.</div>
    </div>
  );
}
