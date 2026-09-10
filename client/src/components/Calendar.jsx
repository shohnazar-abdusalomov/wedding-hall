import { useState, useMemo } from 'react';

const WEEKDAYS = ['Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sha', 'Ya'];
const MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
];

function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fmtPrice(n) {
  return n ? n.toLocaleString('uz-UZ') + ' so\'m' : '';
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

export default function Calendar({ bookings = [], onSelectDate, selectedDate, onClickBooked, isOwner = false }) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [hoveredBooking, setHoveredBooking] = useState(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const bookedMap = useMemo(() => {
    const m = {};
    bookings.forEach(b => { m[b.date] = b; });
    return m;
  }, [bookings]);

  const days = useMemo(() => {
    const first = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0).getDate();
    let startWeekday = first.getDay();
    // Monday-start: convert Sunday=0 to 6, Mon=1 to 0, etc.
    startWeekday = startWeekday === 0 ? 6 : startWeekday - 1;
    const cells = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= lastDay; d++) cells.push(d);
    return cells;
  }, [year, month]);

  const todayISO = toISO(new Date());

  const prev = () => setViewDate(new Date(year, month - 1, 1));
  const next = () => setViewDate(new Date(year, month + 1, 1));

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button className="btn btn-ghost btn-sm" onClick={prev}>&larr;</button>
        <h4>{MONTHS[month]} {year}</h4>
        <button className="btn btn-ghost btn-sm" onClick={next}>&rarr;</button>
      </div>
      <div className="calendar-weekdays">
        {WEEKDAYS.map(w => <div key={w}>{w}</div>)}
      </div>
      <div className="calendar-days">
        {days.map((d, i) => {
          if (d === null) return <div key={`e${i}`} className="cal-day empty" />;
          const iso = toISO(new Date(year, month, d));
          const isPast = iso < todayISO;
          const isBooked = !!bookedMap[iso];
          const isSelected = selectedDate === iso;
          const isToday = iso === todayISO;

          let cls = 'cal-day';
          if (isPast) cls += ' past';
          else if (isBooked) cls += ' booked';
          else cls += ' free';
          if (isSelected) cls += ' selected';
          if (isToday) cls += ' today';

          const handleClick = () => {
            if (isPast) return;
            if (isBooked) {
              if (onClickBooked) onClickBooked(bookedMap[iso]);
              return;
            }
            if (onSelectDate) onSelectDate(iso);
          };

          return (
            <div
              key={iso}
              className={cls}
              onClick={handleClick}
              onMouseEnter={() => isBooked && isOwner && setHoveredBooking(iso)}
              onMouseLeave={() => setHoveredBooking(null)}
              style={{ position: 'relative' }}
            >
              {d}
              {hoveredBooking === iso && isOwner && bookedMap[iso] && (
                <div className="booking-popup">
                  <div className="booking-popup-row">
                    <span className="booking-popup-label">Bron qilgan:</span>
                    <span>{bookedMap[iso].userFirstName} {bookedMap[iso].userLastName}</span>
                  </div>
                  <div className="booking-popup-row">
                    <span className="booking-popup-label">Bron sanasi:</span>
                    <span>{fmtDate(bookedMap[iso].createdAt)}</span>
                  </div>
                  <div className="booking-popup-row">
                    <span className="booking-popup-label">Narxi:</span>
                    <span>{fmtPrice(bookedMap[iso].totalPrice)}</span>
                  </div>
                  <div className="booking-popup-row">
                    <span className="booking-popup-label">Mehmonlar:</span>
                    <span>{bookedMap[iso].guestCount} kishi</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="calendar-legend">
        <span><span className="legend-dot legend-past" /> O'tgan kunlar</span>
        <span><span className="legend-dot legend-booked" /> Bron qilingan</span>
        <span><span className="legend-dot legend-free" /> Bo'sh</span>
      </div>
    </div>
  );
}
