import { useEffect, useRef, useState } from 'react';
import { loadLeaflet, DEFAULT_CENTER } from '../utils/leaflet';

/**
 * Xaritada manzilni ko'rsatish yoki tanlash komponenti.
 * - readOnly=false (default): bosib joy tanlanadi + qidiruv mavjud (egasi uchun)
 * - readOnly=true: faqat ko'rsatadi (foydalanuvchi bron qilayotganda)
 */
export default function LocationMap({ value, onChange, readOnly = false, height = 280 }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);

  const hasValue = value && typeof value.lat === 'number' && typeof value.lng === 'number';

  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const center = hasValue ? [value.lat, value.lng] : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng];
      const map = L.map(containerRef.current, {
        center,
        zoom: hasValue ? 16 : 12,
        scrollWheelZoom: !readOnly,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      if (hasValue) {
        markerRef.current = L.marker([value.lat, value.lng]).addTo(map);
      }

      if (!readOnly) {
        map.on('click', (e) => {
          const { lat, lng } = e.latlng;
          setMarker(L, map, lat, lng);
          onChange && onChange({ lat, lng });
        });
      }

      mapRef.current = map;
      setReady(true);
      // Container o'lchami modal/layout ichida kechroq aniqlanishi mumkin
      setTimeout(() => map.invalidateSize(), 200);
    });
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tashqaridan value o'zgarsa markerni yangilaymiz
  useEffect(() => {
    if (!ready || !mapRef.current || !window.L) return;
    if (hasValue) {
      setMarker(window.L, mapRef.current, value.lat, value.lng);
      mapRef.current.setView([value.lat, value.lng], mapRef.current.getZoom());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.lat, value?.lng, ready]);

  function setMarker(L, map, lat, lng) {
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng]).addTo(map);
    }
  }

  // Nominatim (OpenStreetMap) tekin geokodlash — manzilni qidirish
  async function handleSearch(e) {
    e.preventDefault();
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(search + ', Toshkent, Uzbekistan')}`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setMarker(window.L, mapRef.current, lat, lng);
        mapRef.current.setView([lat, lng], 16);
        onChange && onChange({ lat, lng });
      }
    } catch {
      /* qidiruv xatosi — jim qoldiramiz */
    } finally {
      setSearching(false);
    }
  }

  return (
    <div>
      {!readOnly && (
        <div className="map-search-row">
          <input
            className="form-input"
            placeholder="Manzilni qidiring — masalan: Amir Temur ko'chasi"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(e); }}
          />
          <button type="button" className="btn btn-primary btn-sm" onClick={handleSearch} disabled={searching}>
            {searching ? 'Qidirilmoqda…' : 'Qidirish'}
          </button>
        </div>
      )}
      <div className="map-shell">
        <div ref={containerRef} style={{ height, width: '100%', zIndex: 0 }} />
      </div>
      {!readOnly && (
        <div className="map-hint">
          {hasValue ? (
            <span className="map-coord-badge">📍 {value.lat.toFixed(5)}, {value.lng.toFixed(5)}</span>
          ) : (
            <>👆 Xaritani bosib to'yxona joylashuvini belgilang</>
          )}
        </div>
      )}
    </div>
  );
}
