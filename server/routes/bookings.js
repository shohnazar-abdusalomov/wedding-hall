const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { authMiddleware, roleGuard, SECRET } = require('../middleware/auth');

// Strip personally-identifiable info from a booking unless the caller is
// allowed to see it (admin, the venue's owner, or the booking's own user).
function publicBooking(b) {
  return {
    _id: b._id,
    venueId: b.venueId,
    date: b.date,
    guestCount: b.guestCount,
    status: b.status,
  };
}

function decodeUser(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  try { return jwt.verify(header.split(' ')[1], SECRET); } catch { return null; }
}

// Create booking
router.post('/', authMiddleware, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { venueId, date, guestCount, selectedServices } = req.body;

    // Validate guest count
    const guests = parseInt(guestCount, 10);
    if (!Number.isInteger(guests) || guests < 1) {
      return res.status(400).json({ message: 'Mehmonlar sonini to\'g\'ri kiriting' });
    }

    // Validate date
    const bookDate = new Date(date);
    if (isNaN(bookDate.getTime())) {
      return res.status(400).json({ message: 'Sana noto\'g\'ri' });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (bookDate < today) {
      return res.status(400).json({ message: 'O\'tgan sanani tanlab bo\'lmaydi' });
    }

    // Check venue
    const venue = await db.venues.findOne({ _id: venueId });
    if (!venue || venue.status !== 'tasdiqlangan') {
      return res.status(404).json({ message: 'To\'yxona topilmadi yoki tasdiqlanmagan' });
    }

    // Check capacity
    if (guests > venue.capacity) {
      return res.status(400).json({ message: `Odamlar soni sig'imdan (${venue.capacity}) oshib ketdi` });
    }

    // Check date availability
    const dateStr = new Date(date).toISOString().split('T')[0];
    const existing = await db.bookings.findOne({ venueId, date: dateStr, status: 'active' });
    if (existing) {
      return res.status(409).json({ message: 'Bu sana allaqachon band' });
    }

    // Calculate price
    let totalPrice = guests * venue.pricePerSeat;
    let serviceDetails = [];

    if (selectedServices && Array.isArray(selectedServices)) {
      for (const svc of selectedServices) {
        if (svc.type === 'singer' && venue.services.singers) {
          const singer = venue.services.singers.find(s => s.name === svc.name);
          if (singer) {
            totalPrice += singer.price;
            serviceDetails.push({ type: 'Honanda', name: singer.name, price: singer.price });
          }
        }
        if (svc.type === 'karnaySurnay' && venue.services.karnaySurnay?.available) {
          totalPrice += venue.services.karnaySurnay.price;
          serviceDetails.push({ type: 'Karnay-surnay', name: 'Karnay-surnay', price: venue.services.karnaySurnay.price });
        }
        if (svc.type === 'car' && venue.services.cars) {
          const car = venue.services.cars.find(c => c.brand === svc.brand);
          if (car) {
            totalPrice += car.price;
            serviceDetails.push({ type: 'Mashina', name: car.brand, price: car.price });
          }
        }
      }
    }

    const advance = Math.round(totalPrice * 0.2);

    const booking = await db.bookings.insert({
      venueId,
      venueName: venue.name,
      venueDistrict: venue.district,
      date: dateStr,
      guestCount: guests,
      totalPrice,
      advance,
      services: serviceDetails,
      userId: req.user.id,
      userFirstName: req.user.firstName,
      userLastName: req.user.lastName,
      userPhone: req.user.phone || '',
      status: 'active',
      createdAt: new Date().toISOString(),
    });

    res.status(201).json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// Get bookings (filtered by role)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { venueId, district, status: bStatus, sortBy, order, venue: venueName } = req.query;
    const filter = {};

    if (req.user.role === 'user') {
      filter.userId = req.user.id;
    } else if (req.user.role === 'owner') {
      // Get owner's venues
      const ownerVenues = await db.venues.find({ ownerId: req.user.id });
      const venueIds = ownerVenues.map(v => v._id);
      // Constrain an optional venueId filter to the owner's own venues.
      filter.venueId = venueId && venueIds.includes(venueId) ? venueId : { $in: venueIds };
    } else if (venueId) {
      // admin may filter by a specific venue
      filter.venueId = venueId;
    }

    if (district) filter.venueDistrict = district;
    if (venueName) filter.venueName = venueName;

    let bookings = await db.bookings.find(filter);

    // Add computed status
    const today = new Date().toISOString().split('T')[0];
    bookings = bookings.map(b => ({
      ...b,
      timeStatus: b.status === 'cancelled' ? 'bekor qilingan' : (b.date < today ? 'bo\'lib o\'tgan' : 'endi bo\'ladigan'),
    }));

    if (bStatus) {
      if (bStatus === 'past') bookings = bookings.filter(b => b.timeStatus === 'bo\'lib o\'tgan');
      else if (bStatus === 'upcoming') bookings = bookings.filter(b => b.timeStatus === 'endi bo\'ladigan');
      else if (bStatus === 'cancelled') bookings = bookings.filter(b => b.timeStatus === 'bekor qilingan');
    }

    // Sort
    if (sortBy === 'date') {
      bookings.sort((a, b) => order === 'desc' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));
    } else {
      bookings.sort((a, b) => b.date.localeCompare(a.date));
    }

    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// Get bookings for a specific venue (for calendar).
// Booker name/phone is only revealed to the admin or the venue's owner.
router.get('/venue/:venueId', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const bookings = await db.bookings.find({ venueId: req.params.venueId, status: 'active' });

    const caller = decodeUser(req);
    let canSeePII = false;
    if (caller?.role === 'admin') {
      canSeePII = true;
    } else if (caller?.role === 'owner') {
      const venue = await db.venues.findOne({ _id: req.params.venueId });
      canSeePII = !!venue && venue.ownerId === caller.id;
    }

    res.json(canSeePII ? bookings : bookings.map(publicBooking));
  } catch (err) {
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// Cancel booking
router.patch('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const booking = await db.bookings.findOne({ _id: req.params.id });
    if (!booking) return res.status(404).json({ message: 'Bron topilmadi' });

    // Permission check
    if (req.user.role === 'user' && booking.userId !== req.user.id) {
      return res.status(403).json({ message: 'Ruxsat yo\'q' });
    }
    if (req.user.role === 'owner') {
      const venue = await db.venues.findOne({ _id: booking.venueId });
      if (!venue || venue.ownerId !== req.user.id) {
        return res.status(403).json({ message: 'Ruxsat yo\'q' });
      }
    }

    await db.bookings.update({ _id: req.params.id }, { $set: { status: 'cancelled' } });
    const updated = await db.bookings.findOne({ _id: req.params.id });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server xatosi' });
  }
});

module.exports = router;
