// Leaflet'ni CDN'dan bir marta yuklaymiz (tekin, API key kerak emas)
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

// Toshkent markazi (default)
export const DEFAULT_CENTER = { lat: 41.311081, lng: 69.240562 };

// Toshkent rayonlari markazlari — geokodlash ishlamasa, kamida rayon markazini
// ko'rsatamiz, shunda to'yxona sahifasida "📍 Joylashuvi" doim chiqadi.
export const DISTRICT_CENTERS = {
  'Bektemir': { lat: 41.2236, lng: 69.3344 },
  'Chilonzor': { lat: 41.2747, lng: 69.2039 },
  'Yakkasaroy': { lat: 41.2894, lng: 69.2581 },
  'Mirobod': { lat: 41.2894, lng: 69.2900 },
  'Mirzo Ulug\'bek': { lat: 41.3275, lng: 69.3417 },
  'Sergeli': { lat: 41.2256, lng: 69.2253 },
  'Shayxontohur': { lat: 41.3247, lng: 69.2256 },
  'Olmazor': { lat: 41.3614, lng: 69.2272 },
  'Uchtepa': { lat: 41.2917, lng: 69.1683 },
  'Yashnaobod': { lat: 41.2967, lng: 69.3344 },
  'Yunusobod': { lat: 41.3656, lng: 69.2867 },
  'Toshkent tumani': { lat: 41.3300, lng: 69.4500 },
};

// Berilgan rayon uchun markaz koordinatasi (topilmasa — Toshkent markazi).
export function districtCenter(district) {
  return DISTRICT_CENTERS[district] || DEFAULT_CENTER;
}

let leafletPromise = null;

// Manzil matnidan koordinata olish (Nominatim — tekin, API key kerak emas).
// Topilsa { lat, lng } qaytaradi, aks holda null.
export async function geocode(query) {
  if (!query || !query.trim()) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
    );
    const data = await res.json();
    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
  } catch {
    /* tarmoq xatosi — null qaytaramiz */
  }
  return null;
}

export function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = reject;
    document.body.appendChild(script);
  });
  return leafletPromise;
}
