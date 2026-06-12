const router = require('express').Router();
const { authMiddleware, roleGuard } = require('../middleware/auth');

const DISTRICTS = [
  'Bektemir', 'Chilonzor', 'Yakkasaroy', 'Mirobod',
  'Mirzo Ulug\'bek', 'Sergeli', 'Shayxontohur', 'Olmazor',
  'Uchtepa', 'Yashnaobod', 'Yunusobod', 'Toshkent tumani'
];

// Get all venues (public - only approved; admin/owner - all)
router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { search, district, status, sortBy, order, page = 1, limit = 50 } = req.query;
    const filter = {};

    // Check if authenticated and admin/owner
    let isPrivileged = false;
    try {
      const jwt = require('jsonwebtoken');
      const { SECRET } = require('../middleware/auth');
      const header = req.headers.authorization;
      if (header && header.startsWith('Bearer ')) {
        const decoded = jwt.verify(header.split(' ')[1], SECRET);
        if (decoded.role === 'admin' || decoded.role === 'owner') {
          isPrivileged = true;
          if (decoded.role === 'owner') {
            // Owner sees only their venues
            filter.ownerId = decoded.id;
          }
        }
      }
    } catch {}

    if (!isPrivileged) {
      filter.status = 'tasdiqlangan';
    } else if (status) {
      filter.status = status;
    }

    if (search) {
      filter.name = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }
    if (district) filter.district = district;

    let venues = await db.venues.find(filter);

    // Sort
    if (sortBy === 'price') {
      venues.sort((a, b) => order === 'desc' ? b.pricePerSeat - a.pricePerSeat : a.pricePerSeat - b.pricePerSeat);
    } else if (sortBy === 'capacity') {
      venues.sort((a, b) => order === 'desc' ? b.capacity - a.capacity : a.capacity - b.capacity);
    } else {
      venues.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    res.json({ venues, districts: DISTRICTS });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// Get single venue. Returns only the booked dates (no PII) for the calendar.
router.get('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const venue = await db.venues.findOne({ _id: req.params.id });
    if (!venue) return res.status(404).json({ message: 'To\'yxona topilmadi' });

    const bookings = await db.bookings.find({ venueId: venue._id, status: 'active' });
    const dates = bookings.map(b => ({ _id: b._id, date: b.date, guestCount: b.guestCount }));
    res.json({ venue, bookings: dates });
  } catch (err) {
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// Create venue (admin or owner)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const upload = req.app.locals.upload;

    // Parse form data (multipart)
    const data = req.body;
    const venue = {
      name: data.name,
      district: data.district,
      address: data.address,
      capacity: parseInt(data.capacity),
      pricePerSeat: parseInt(data.pricePerSeat),
      phone: data.phone,
      photos: data.photos ? (typeof data.photos === 'string' ? JSON.parse(data.photos) : data.photos) : [],
      services: {
        singers: data.singers ? (typeof data.singers === 'string' ? JSON.parse(data.singers) : data.singers) : [],
        karnaySurnay: data.karnaySurnayAvailable === 'true' || data.karnaySurnayAvailable === true
          ? { available: true, price: parseInt(data.karnaySurnayPrice) || 0 }
          : { available: false, price: 0 },
        menu: data.menu ? (typeof data.menu === 'string' ? JSON.parse(data.menu) : data.menu) : [],
        cars: data.cars ? (typeof data.cars === 'string' ? JSON.parse(data.cars) : data.cars) : [],
      },
      status: req.user.role === 'admin' ? 'tasdiqlangan' : 'tasdiqlanmagan',
      ownerId: req.user.role === 'owner' ? req.user.id : (data.ownerId || null),
      createdAt: new Date().toISOString(),
    };

    const created = await db.venues.insert(venue);
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// Update venue
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const venue = await db.venues.findOne({ _id: req.params.id });
    if (!venue) return res.status(404).json({ message: 'To\'yxona topilmadi' });

    if (req.user.role === 'owner' && venue.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'Ruxsat yo\'q' });
    }

    const data = req.body;
    const updates = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.district !== undefined) updates.district = data.district;
    if (data.address !== undefined) updates.address = data.address;
    if (data.capacity !== undefined) updates.capacity = parseInt(data.capacity);
    if (data.pricePerSeat !== undefined) updates.pricePerSeat = parseInt(data.pricePerSeat);
    if (data.phone !== undefined) updates.phone = data.phone;
    if (data.photos !== undefined) updates.photos = typeof data.photos === 'string' ? JSON.parse(data.photos) : data.photos;
    if (data.services !== undefined) updates.services = typeof data.services === 'string' ? JSON.parse(data.services) : data.services;
    if (data.singers !== undefined) {
      updates['services.singers'] = typeof data.singers === 'string' ? JSON.parse(data.singers) : data.singers;
    }
    if (data.karnaySurnayAvailable !== undefined) {
      updates['services.karnaySurnay'] = {
        available: data.karnaySurnayAvailable === 'true' || data.karnaySurnayAvailable === true,
        price: parseInt(data.karnaySurnayPrice) || 0
      };
    }
    if (data.menu !== undefined) {
      updates['services.menu'] = typeof data.menu === 'string' ? JSON.parse(data.menu) : data.menu;
    }
    if (data.cars !== undefined) {
      updates['services.cars'] = typeof data.cars === 'string' ? JSON.parse(data.cars) : data.cars;
    }

    await db.venues.update({ _id: req.params.id }, { $set: updates });
    const updated = await db.venues.findOne({ _id: req.params.id });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// Delete venue (admin only)
router.delete('/:id', authMiddleware, roleGuard('admin'), async (req, res) => {
  try {
    const db = req.app.locals.db;
    await db.venues.remove({ _id: req.params.id });
    await db.bookings.remove({ venueId: req.params.id }, { multi: true });
    res.json({ message: 'O\'chirildi' });
  } catch (err) {
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// Approve venue (admin only)
router.patch('/:id/approve', authMiddleware, roleGuard('admin'), async (req, res) => {
  try {
    const db = req.app.locals.db;
    await db.venues.update({ _id: req.params.id }, { $set: { status: 'tasdiqlangan' } });
    const venue = await db.venues.findOne({ _id: req.params.id });
    res.json(venue);
  } catch (err) {
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// Assign owner
router.patch('/:id/assign-owner', authMiddleware, roleGuard('admin'), async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { ownerId } = req.body;
    await db.venues.update({ _id: req.params.id }, { $set: { ownerId } });
    const venue = await db.venues.findOne({ _id: req.params.id });
    res.json(venue);
  } catch (err) {
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// Upload photos
router.post('/upload-photos', authMiddleware, (req, res) => {
  const upload = req.app.locals.upload;
  upload.array('photos', 10)(req, res, (err) => {
    if (err) return res.status(400).json({ message: 'Yuklashda xatolik' });
    const urls = req.files.map(f => `/uploads/${f.filename}`);
    res.json({ urls });
  });
});

// Get districts list
router.get('/meta/districts', (req, res) => {
  res.json(DISTRICTS);
});

module.exports = router;
