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

export default function Calendar({ bookings = [], onSelectDate, selectedDate, onClickBooked }) {
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
              onMouseEnter={() => isBooked && setHoveredBooking(iso)}
              onMouseLeave={() => setHoveredBooking(null)}
              style={{ position: 'relative' }}
            >
              {d}
              {hoveredBooking === iso && bookedMap[iso] && (
                <div className="booking-popup">
                  <strong>{bookedMap[iso].userFirstName} {bookedMap[iso].userLastName}</strong><br />
                  {bookedMap[iso].guestCount} kishi
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
