import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadLeaflet, DEFAULT_CENTER } from '../utils/leaflet';

function formatPrice(n) { return n ? n.toLocaleString('uz-UZ') : '0'; }

/**
 * Barcha to'yxonalarni bitta xaritada markerlar ko'rinishida ko'rsatadi.
 * Markerga bosilganda popup chiqadi va "Batafsil" tugmasi orqali detalga o'tadi.
 */
export default function VenuesMap({ venues = [], height = 520 }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const navigate = useNavigate();

  // Faqat koordinatasi bor to'yxonalar
  const located = venues.filter(v => typeof v.lat === 'number' && typeof v.lng === 'number');

  // Xaritani bir marta yaratamiz
  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current, {
        center: [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng],
        zoom: 11,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;
      // Detal sahifasiga o'tish uchun global handler (popup ichidan chaqiriladi)
      window.__goVenue = (id) => navigate(`/venue/${id}`);
      setTimeout(() => map.invalidateSize(), 200);
      renderMarkers(L);
    });
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // To'yxonalar ro'yxati o'zgarsa markerlarni qayta chizamiz
  useEffect(() => {
    if (mapRef.current && window.L) renderMarkers(window.L);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venues]);

  function renderMarkers(L) {
    const map = mapRef.current;
    if (!map) return;
    if (layerRef.current) { map.removeLayer(layerRef.current); }
    const group = L.layerGroup();
    located.forEach(v => {
      const popup = `
        <div class="venue-popup">
          <div class="vp-name">${escapeHtml(v.name)}</div>
          <div class="vp-meta">📍 ${escapeHtml(v.district)} · ${escapeHtml(v.address || '')}</div>
          <div class="vp-price">${formatPrice(v.pricePerSeat)} so'm/kishi · 👥 ${v.capacity}</div>
          <button class="vp-btn" onclick="window.__goVenue('${v._id}')">Batafsil ko'rish →</button>
        </div>`;
      L.marker([v.lat, v.lng]).bindPopup(popup).addTo(group);
    });
    group.addTo(map);
    layerRef.current = group;

    // Barcha markerlar ko'rinadigan qilib zoom sozlaymiz
    if (located.length > 0) {
      const bounds = L.latLngBounds(located.map(v => [v.lat, v.lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }

  return (
    <div>
      <div className="map-shell">
        {located.length > 0 && (
          <span className="map-count-pill">
            <span className="dot" />
            {located.length} ta to'yxona xaritada
          </span>
        )}
        <div ref={containerRef} style={{ height, width: '100%', zIndex: 0 }} />
      </div>
      {located.length === 0 && (
        <div className="map-hint" style={{ marginTop: '0.6rem' }}>
          Bu filtr bo'yicha xaritada ko'rsatish uchun joylashuvi belgilangan to'yxona topilmadi.
        </div>
      )}
    </div>
  );
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
